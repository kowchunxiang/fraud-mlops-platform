from fastapi import FastAPI
from pydantic import BaseModel

from src.predict import predict_transaction


app = FastAPI()


class Transaction(BaseModel):
    step: int
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float


@app.get("/")
def root():
    return {
        "message": "Fraud Detection API is running"
    }


@app.post("/predict")
def predict(transaction: Transaction):
    result = predict_transaction(transaction.model_dump())

    return result