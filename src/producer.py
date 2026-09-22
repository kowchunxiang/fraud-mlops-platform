import csv
import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone

from kafka import KafkaProducer


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
    "data/paysim_sample.csv",
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
        interval_ms = max(
            200,
            min(int(interval_ms), 5000),
        )

        with self._lock:
            self._interval_ms = interval_ms

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

    def _build_producer(self):
        return KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            acks="all",
            retries=5,
        )

    def _row_to_event(self, row):
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

    def _run(self):
        producer = None

        try:
            while self.running:
                if not os.path.exists(PAYSIM_CSV):
                    self.last_error = (
                        f"PaySim file not found: {PAYSIM_CSV}"
                    )
                    time.sleep(2)
                    continue

                if producer is None:
                    try:
                        producer = self._build_producer()
                        self.last_error = None
                    except Exception as error:
                        self.last_error = str(error)
                        time.sleep(2)
                        continue

                try:
                    with open(
                        PAYSIM_CSV,
                        "r",
                        newline="",
                        encoding="utf-8",
                    ) as file:
                        reader = csv.DictReader(file)

                        for row in reader:
                            if not self.running:
                                break

                            try:
                                event = self._row_to_event(row)

                                producer.send(
                                    KAFKA_TOPIC,
                                    event,
                                )

                                producer.flush(timeout=5)

                                self.last_error = None

                            except Exception as error:
                                self.last_error = str(error)

                            time.sleep(
                                self.interval_ms / 1000
                            )

                except Exception as error:
                    self.last_error = str(error)
                    time.sleep(2)

                # Re-open the file when EOF is reached, so simulation continues.

        finally:
            if producer is not None:
                try:
                    producer.flush(timeout=5)
                    producer.close(timeout=5)
                except Exception:
                    pass

            with self._lock:
                self._running = False


live_producer = PaySimReplayProducer()

