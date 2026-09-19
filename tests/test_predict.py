import importlib

import mlflow.pyfunc
import pandas as pd


class FakeModel:
    def predict(self, model_input):
        return pd.DataFrame([{
            "fraud_probability": 0.95,
            "prediction": "FRAUD"
        }])


def test_fraud_transaction_prediction(monkeypatch):

    monkeypatch.setattr(
        mlflow.pyfunc,
        "load_model",
        lambda *args, **kwargs: FakeModel()
    )

    predict_module = importlib.import_module("src.predict")

    transaction = {
        "step": 1,
        "type": "TRANSFER",
        "amount": 181.0,
        "oldbalanceOrg": 181.0,
        "newbalanceOrig": 0.0,
        "oldbalanceDest": 0.0,
        "newbalanceDest": 0.0
    }

    result = predict_module.predict_transaction(transaction)

    assert result["prediction"] == "FRAUD"
    assert 0.0 <= result["fraud_probability"] <= 1.0