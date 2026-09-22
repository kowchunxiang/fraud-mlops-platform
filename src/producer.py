import csv
import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone

from kafka import KafkaProducer

from src.db import insert_prediction
from src.predict import predict_transaction


IS_RENDER = os.getenv("RENDER", "").lower() == "true"

LIVE_MODE = os.getenv(
    "LIVE_MODE",
    "direct" if IS_RENDER else "kafka",
).lower()

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092",
)

KAFKA_TOPIC = os.getenv(
    "KAFKA_TOPIC",
    "fraud-transactions",
)

PAYSIM_CSV = os.getenv(
    "PAYSIM_CSV",
    "data/paysim_sample.csv"
    if IS_RENDER
    else "data/PS_20174392719_1491204439457_log.csv",
)


def normalise_prediction(result):
    probability = float(result.get("fraud_probability", 0))
    prediction_text = str(result.get("prediction", "")).upper()

    is_fraud = prediction_text in {
        "FRAUD",
        "POTENTIAL FRAUD",
        "1",
    }

    return (
        "FRAUD" if is_fraud else "NORMAL",
        probability,
    )


class PaySimReplayProducer:
    def __init__(self):
        self._running = False
        self._thread = None
        self._interval_ms = 1000
        self._lock = threading.Lock()
        self.last_error = None

    @property
    def running(self):
        with self._lock:
            return self._running

    @property
    def interval_ms(self):
        with self._lock:
            return self._interval_ms

    def set_interval_ms(self, interval_ms):
        with self._lock:
            self._interval_ms = max(
                200,
                min(int(interval_ms), 5000),
            )

    def start(self, interval_ms=1000):
        self.set_interval_ms(interval_ms)

        with self._lock:
            if self._running:
                return False
            self._running = True

        self._thread = threading.Thread(
            target=self._run,
            daemon=True,
        )
        self._thread.start()

        return True

    def stop(self):
        with self._lock:
            self._running = False

    def row_to_event(self, row):
        return {
            "event_id": str(uuid.uuid4()),
            "event_time": datetime.now(timezone.utc).isoformat(),
            "type": str(row["type"]).upper(),
            "amount": float(row["amount"]),
            "oldbalanceOrg": float(row["oldbalanceOrg"]),
            "newbalanceOrig": float(row["newbalanceOrig"]),
            "oldbalanceDest": float(row["oldbalanceDest"]),
            "newbalanceDest": float(row["newbalanceDest"]),
        }

    def run_direct(self):
        while self.running:
            try:
                with open(
                    PAYSIM_CSV,
                    "r",
                    newline="",
                    encoding="utf-8-sig",
                ) as file:

                    reader = csv.DictReader(file)

                    for row in reader:
                        if not self.running:
                            break

                        event = self.row_to_event(row)

                        transaction = {
                            "type": event["type"],
                            "amount": event["amount"],
                            "oldbalanceOrg": event["oldbalanceOrg"],
                            "newbalanceOrig": event["newbalanceOrig"],
                            "oldbalanceDest": event["oldbalanceDest"],
                            "newbalanceDest": event["newbalanceDest"],
                        }

                        started = time.perf_counter()

                        result = predict_transaction(transaction)

                        latency_ms = round(
                            (time.perf_counter() - started) * 1000
                        )

                        prediction, probability = normalise_prediction(result)

                        insert_prediction(
                            event_id=event["event_id"],
                            event_time=event["event_time"],
                            source="live",
                            transaction=transaction,
                            prediction=prediction,
                            fraud_probability=probability,
                            latency_ms=latency_ms,
                        )

                        self.last_error = None

                        time.sleep(
                            self.interval_ms / 1000
                        )

            except Exception as error:
                self.last_error = str(error)
                time.sleep(2)

    def run_kafka(self):
        producer = None

        try:
            while self.running:

                if producer is None:
                    producer = KafkaProducer(
                        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                        value_serializer=lambda value:
                        json.dumps(value).encode("utf-8"),
                        acks="all",
                        retries=5,
                    )

                with open(
                    PAYSIM_CSV,
                    "r",
                    newline="",
                    encoding="utf-8-sig",
                ) as file:

                    reader = csv.DictReader(file)

                    for row in reader:
                        if not self.running:
                            break

                        event = self.row_to_event(row)

                        producer.send(
                            KAFKA_TOPIC,
                            event,
                        )

                        producer.flush(timeout=5)

                        self.last_error = None

                        time.sleep(
                            self.interval_ms / 1000
                        )

        except Exception as error:
            self.last_error = str(error)

        finally:
            if producer:
                try:
                    producer.close()
                except Exception:
                    pass

    def _run(self):
        try:
            if LIVE_MODE == "direct":
                self.run_direct()
            else:
                self.run_kafka()
        finally:
            with self._lock:
                self._running = False


live_producer = PaySimReplayProducer()
