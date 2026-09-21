import mlflow
import mlflow.pyfunc
import joblib
import pandas as pd

from mlflow.tracking import MlflowClient


TRACKING_URI = "http://127.0.0.1:5000"
MODEL_NAME = "fraud-detection-model"
MODEL_PATH = "models/fraud_model.joblib"


mlflow.set_tracking_uri(TRACKING_URI)


class FraudDetectionModel(mlflow.pyfunc.PythonModel):

    def __init__(self):

        bundle = joblib.load(MODEL_PATH)

        self.model = bundle["model"]
        self.preprocessor = bundle["preprocessor"]
        self.threshold = bundle["threshold"]
        self.features = bundle["features"]


    def predict(self, context, model_input, params=None):

        data = model_input[self.features]

        data_ready = self.preprocessor.transform(data)

        probabilities = self.model.predict_proba(
            data_ready
        )[:, 1]

        predictions = [
            "FRAUD" if probability >= self.threshold else "NORMAL"
            for probability in probabilities
        ]

        return pd.DataFrame({
            "fraud_probability": probabilities,
            "prediction": predictions
        })


with mlflow.start_run(
    run_name="register-final-fraud-model"
) as run:

    model_info = mlflow.pyfunc.log_model(
        artifact_path="model",
        python_model=FraudDetectionModel()
    )


registered_model = mlflow.register_model(
    model_uri=model_info.model_uri,
    name=MODEL_NAME
)


client = MlflowClient()

client.set_registered_model_alias(
    name=MODEL_NAME,
    alias="champion",
    version=registered_model.version
)


print(
    "Model registered successfully!"
)

print(
    "Model:",
    MODEL_NAME
)

print(
    "Version:",
    registered_model.version
)

print(
    "Alias: champion"
)