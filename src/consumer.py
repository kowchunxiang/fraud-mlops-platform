import json
import psycopg2

from confluent_kafka import Consumer
from src.predict import predict_transaction


consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "fraud-detection-group",
    "auto.offset.reset": "earliest"
})

consumer.subscribe(["transactions"])

db = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="fraud_db",
    user="fraud_user",
    password="fraud_password"
)

print("Waiting for transaction...")

try:
    while True:
        message = consumer.poll(1.0)

        if message is None:
            continue

        if message.error():
            print("Kafka error:", message.error())
            continue

        transaction = json.loads(
            message.value().decode("utf-8")
        )

        print("\nTransaction received:")
        print(transaction)

        result = predict_transaction(transaction)

        print("\nFraud detection result:")
        print(
            "Fraud probability:",
            result["fraud_probability"]
        )
        print(
            "Prediction:",
            result["prediction"]
        )

        with db.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO transactions (
                    step,
                    type,
                    amount,
                    oldbalanceOrg,
                    newbalanceOrig,
                    oldbalanceDest,
                    newbalanceDest,
                    fraud_probability,
                    prediction
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                """,
                (
                    transaction["step"],
                    transaction["type"],
                    transaction["amount"],
                    transaction["oldbalanceOrg"],
                    transaction["newbalanceOrig"],
                    transaction["oldbalanceDest"],
                    transaction["newbalanceDest"],
                    result["fraud_probability"],
                    result["prediction"]
                )
            )

        db.commit()

        print("Saved to PostgreSQL!")

except KeyboardInterrupt:
    print("\nConsumer stopped.")

finally:
    consumer.close()
    db.close()