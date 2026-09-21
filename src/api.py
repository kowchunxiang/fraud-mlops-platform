import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()


# 本地开发时默认允许 localhost:5173
# 部署后会从 Render 的环境变量读取真正的 frontend URL
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        FRONTEND_ORIGIN,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
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


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/predict")
def predict(transaction: Transaction):

    from src.predict import predict_transaction

    result = predict_transaction(
        transaction.model_dump()
    )

    return result