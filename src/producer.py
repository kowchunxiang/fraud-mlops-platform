import json
import time

import pandas as pd
from confluent_kafka import Producer


DATA_PATH = "data/PS_20174392719_1491204439457_log.csv"

producer = Producer({
    "bootstrap.servers": "localhost:9092"
})

columns = [
    "step",
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
]

df = pd.read_csv(
    DATA_PATH,
    usecols=columns,
    nrows=20
)

print("Starting transaction stream...")

for _, row in df.iterrows():

    transaction = row.to_dict()

    producer.produce(
        topic="transactions",
        value=json.dumps(transaction)
    )

    producer.flush()

    print("Sent:", transaction)

    time.sleep(1)