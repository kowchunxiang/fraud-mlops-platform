import importlib
import sys

import joblib


FEATURES = [
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
]


class FakePreprocessor:
    def transform(self, frame):
        assert list(frame.columns) == FEATURES
        return frame


class FakeModel:
    def predict_proba(self, model_input):
        return [[0.05, 0.95]]


def test_fraud_transaction_prediction(monkeypatch):
    fake_bundle = {
        "model": FakeModel(),
        "preprocessor": FakePreprocessor(),
        "threshold": 0.80,
        "features": FEATURES,
    }

    monkeypatch.setattr(
        joblib,
        "load",
        lambda *args, **kwargs: fake_bundle,
    )

    sys.modules.pop("src.predict", None)
    predict_module = importlib.import_module("src.predict")

    transaction = {
        "type": "TRANSFER",
        "amount": 181.0,
        "oldbalanceOrg": 181.0,
        "newbalanceOrig": 0.0,
        "oldbalanceDest": 0.0,
        "newbalanceDest": 0.0,
    }

    result = predict_module.predict_transaction(transaction)

    assert result["prediction"] == "FRAUD"
    assert result["fraud_probability"] == 0.95
