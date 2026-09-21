import joblib
import pandas as pd


MODEL_PATH = "models/fraud_model.joblib"


bundle = joblib.load(MODEL_PATH)

model = bundle["model"]
preprocessor = bundle["preprocessor"]
threshold = bundle["threshold"]
features = bundle["features"]


def predict_transaction(transaction_data):

    transaction = pd.DataFrame(
        [transaction_data]
    )

    transaction = transaction[
        features
    ]

    transaction_ready = (
        preprocessor.transform(
            transaction
        )
    )

    fraud_probability = (
        model.predict_proba(
            transaction_ready
        )[0][1]
    )

    prediction = (
        "FRAUD"
        if fraud_probability >= threshold
        else "NORMAL"
    )

    return {
        "fraud_probability": round(
            float(fraud_probability),
            4
        ),
        "prediction": prediction
    }