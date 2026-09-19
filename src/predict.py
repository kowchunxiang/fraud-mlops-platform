import mlflow
import pandas as pd


TRACKING_URI = "http://127.0.0.1:5000"
MODEL_URI = "models:/fraud-detection-model@champion"

mlflow.set_tracking_uri(TRACKING_URI)

model = mlflow.pyfunc.load_model(MODEL_URI)

print("MLflow champion model loaded successfully!")


def predict_transaction(transaction_data):
    transaction = pd.DataFrame([transaction_data])

    result = model.predict(transaction)

    return {
        "fraud_probability": round(
            float(result.iloc[0]["fraud_probability"]),
            4
        ),
        "prediction": str(
            result.iloc[0]["prediction"]
        )
    }


if __name__ == "__main__":
    transaction = {
        "step": 1,
        "type": "TRANSFER",
        "amount": 181.00,
        "oldbalanceOrg": 181.00,
        "newbalanceOrig": 0.00,
        "oldbalanceDest": 0.00,
        "newbalanceDest": 0.00
    }

    result = predict_transaction(transaction)

    print("\nFraud probability:", result["fraud_probability"])
    print("Prediction:", result["prediction"])