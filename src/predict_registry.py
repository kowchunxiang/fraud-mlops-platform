import mlflow
import pandas as pd


mlflow.set_tracking_uri("http://127.0.0.1:5000")

model = mlflow.pyfunc.load_model(
    "models:/fraud-detection-model@champion"
)

transaction = pd.DataFrame([{
    "step": 1,
    "type": "TRANSFER",
    "amount": 181.0,
    "oldbalanceOrg": 181.0,
    "newbalanceOrig": 0.0,
    "oldbalanceDest": 0.0,
    "newbalanceDest": 0.0
}])

result = model.predict(transaction)

print(result)