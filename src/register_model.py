import joblib
import mlflow
import pandas as pd

from mlflow.models import infer_signature


MODEL_PATH = "models/fraud_model.joblib"

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("fraud-detection")


class FraudDetectionModel(mlflow.pyfunc.PythonModel):

    def load_context(self, context):
        bundle = joblib.load(context.artifacts["model_bundle"])

        self.model = bundle["model"]
        self.preprocessor = bundle["preprocessor"]
        self.threshold = bundle["threshold"]
        self.features = bundle["features"]

    def predict(self, context, model_input, params=None):
        data = model_input[self.features]

        data_ready = self.preprocessor.transform(data)

        probabilities = self.model.predict_proba(data_ready)[:, 1]

        predictions = [
            "FRAUD" if probability >= self.threshold else "NORMAL"
            for probability in probabilities
        ]

        return pd.DataFrame({
            "fraud_probability": probabilities,
            "prediction": predictions
        })


input_example = pd.DataFrame([{
    "step": 1,
    "type": "TRANSFER",
    "amount": 181.0,
    "oldbalanceOrg": 181.0,
    "newbalanceOrig": 0.0,
    "oldbalanceDest": 0.0,
    "newbalanceDest": 0.0
}])

output_example = pd.DataFrame([{
    "fraud_probability": 0.9388,
    "prediction": "FRAUD"
}])

signature = infer_signature(
    input_example,
    output_example
)


with mlflow.start_run(run_name="register-fraud-model"):

    model_info = mlflow.pyfunc.log_model(
        name="fraud_model",
        python_model=FraudDetectionModel(),
        artifacts={
            "model_bundle": MODEL_PATH
        },
        input_example=input_example,
        signature=signature,
        registered_model_name="fraud-detection-model"
    )

print("\nModel registered successfully!")
print("Model URI:", model_info.model_uri)