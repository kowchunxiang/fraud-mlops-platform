import json
import os
import threading
import time

from kafka import KafkaConsumer

from src.db import insert_prediction
from src.predict import predict_transaction


KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092",
)

KAFKA_TOPIC = os.getenv(
    "KAFKA_TOPIC",
    "fraud-transactions",
)


def _normalise_prediction(result):
    probability = float(
        result.get(
            "fraud_probability",
            0,
        )
    )

    prediction_text = str(
        result.get(
            "prediction",
            "",
        )
    ).upper()

    is_fraud = (
        prediction_text == "FRAUD"
        or prediction_text == "POTENTIAL FRAUD"
        or prediction_text == "1"
    )

    return (
        "FRAUD" if is_fraud else "NORMAL",
        probability,
    )


class FraudConsumerService:
    def __init__(self):
        self._running = False
        self._thread = None
        self.last_error = None

    @property
    def running(self):
        return self._running

    def start(self):
        if self._running:
            return

        self._running = True

        self._thread = threading.Thread(
            target=self._run,
            daemon=True,
        )

        self._thread.start()

    def stop(self):
        self._running = False

    def _create_consumer(self):
        return KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id="fraud-model-consumer-v1",
            auto_offset_reset="latest",
            enable_auto_commit=True,
            value_deserializer=lambda value: json.loads(
                value.decode("utf-8")
            ),
            consumer_timeout_ms=1000,
        )

    def _run(self):
        while self._running:
            consumer = None

            try:
                consumer = self._create_consumer()
                self.last_error = None

                while self._running:
                    found_message = False

                    for message in consumer:
                        found_message = True

                        event = message.value

                        transaction = {
                            "type": str(
                                event["type"]
                            ).upper(),

                            "amount": float(
                                event["amount"]
                            ),

                            "oldbalanceOrg": float(
                                event["oldbalanceOrg"]
                            ),

                            "newbalanceOrig": float(
                                event["newbalanceOrig"]
                            ),

                            "oldbalanceDest": float(
                                event["oldbalanceDest"]
                            ),

                            "newbalanceDest": float(
                                event["newbalanceDest"]
                            ),
                        }

                        started = time.perf_counter()

                        result = predict_transaction(
                            transaction
                        )

                        latency_ms = round(
                            (
                                time.perf_counter()
                                - started
                            )
                            * 1000
                        )

                        prediction, probability = (
                            _normalise_prediction(
                                result
                            )
                        )

                        insert_prediction(
                            event_id=event["event_id"],
                            event_time=event["event_time"],
                            source="live",
                            transaction=transaction,
                            prediction=prediction,
                            fraud_probability=probability,
                            latency_ms=latency_ms,
                        )

                    if not found_message:
                        continue

            except Exception as error:
                self.last_error = str(error)
                time.sleep(2)

            finally:
                if consumer is not None:
                    try:
                        consumer.close()
                    except Exception:
                        pass


fraud_consumer = FraudConsumerService()
