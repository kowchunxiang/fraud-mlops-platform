import io
import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pandas as pd

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.consumer import fraud_consumer
from src.db import (
    clear_live_transactions,
    get_latest_transactions,
    get_live_stats,
    init_db,
    insert_prediction,
)
from src.producer import live_producer


FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # PostgreSQL may need a few seconds after Docker starts.
    last_error = None

    for _ in range(20):
        try:
            init_db()
            last_error = None
            break
        except Exception as error:
            last_error = error
            time.sleep(1)

    if last_error is not None:
        raise last_error

    fraud_consumer.start()

    yield

    live_producer.stop()
    fraud_consumer.stop()


app = FastAPI(lifespan=lifespan)


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


class SimulationConfig(BaseModel):
    interval_ms: int = Field(
        default=1000,
        ge=200,
        le=5000,
    )


REQUIRED_COLUMNS = [
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
]


batch_jobs = {}
batch_lock = threading.Lock()


def normalise_prediction(result):
    probability = float(
        result.get(
            "fraud_probability",
            0,
        )
    )

    prediction_text = str(
        result.get(
            "prediction",
            "",
        )
    ).upper()

    is_fraud = (
        prediction_text == "FRAUD"
        or prediction_text == "POTENTIAL FRAUD"
        or prediction_text == "1"
    )

    return (
        "FRAUD" if is_fraud else "NORMAL",
        probability,
    )


@app.get("/")
def root():
    return {
        "message": "Fraud Detection API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "consumer_running": fraud_consumer.running if LIVE_MODE == "kafka" else False,`r`n        "consumer_error": fraud_consumer.last_error if LIVE_MODE == "kafka" else None,
    }


# ============================================================
# SINGLE PREDICTION
# ============================================================

@app.post("/predict")
def predict(transaction: Transaction):
    from src.predict import predict_transaction

    transaction_dict = transaction.model_dump()

    started = time.perf_counter()

    result = predict_transaction(
        transaction_dict
    )

    latency_ms = round(
        (
            time.perf_counter()
            - started
        )
        * 1000
    )

    prediction, probability = (
        normalise_prediction(
            result
        )
    )

    insert_prediction(
        event_id=str(uuid.uuid4()),
        event_time=datetime.now(
            timezone.utc
        ).isoformat(),
        source="single",
        transaction=transaction_dict,
        prediction=prediction,
        fraud_probability=probability,
        latency_ms=latency_ms,
    )

    return result


# ============================================================
# REAL-TIME SIMULATION
# ============================================================

@app.post("/live/start")
def live_start(config: SimulationConfig):
    started = live_producer.start(
        interval_ms=config.interval_ms
    )

    if not started:
        live_producer.set_interval_ms(
            config.interval_ms
        )

    return {
        "running": live_producer.running,
        "interval_ms": live_producer.interval_ms,
        "producer_error": live_producer.last_error,
    }


@app.post("/live/stop")
def live_stop():
    live_producer.stop()

    return {
        "running": False
    }


@app.get("/live/status")
def live_status():
    stats = get_live_stats()

    return {
        "running": live_producer.running,
        "interval_ms": live_producer.interval_ms,
        "producer_error": live_producer.last_error,
        "consumer_running": fraud_consumer.running if LIVE_MODE == "kafka" else False,`r`n        "consumer_error": fraud_consumer.last_error if LIVE_MODE == "kafka" else None,
        **stats,
    }


@app.get("/live/transactions")
def live_transactions(
    limit: int = Query(
        default=30,
        ge=1,
        le=200,
    ),
):
    rows = get_latest_transactions(
        limit=limit,
        source="live",
    )

    return {
        "transactions": rows
    }


@app.delete("/live/transactions")
def clear_live():
    clear_live_transactions()

    return {
        "status": "cleared"
    }


# ============================================================
# BATCH SCREENING
# ============================================================

def process_batch_job(
    job_id,
    file_bytes,
    filename,
    extension,
):
    from src.predict import predict_transaction

    try:
        if extension == ".csv":
            dataframe = pd.read_csv(
                io.BytesIO(file_bytes)
            )
        else:
            dataframe = pd.read_excel(
                io.BytesIO(file_bytes)
            )

        missing_columns = [
            column
            for column in REQUIRED_COLUMNS
            if column not in dataframe.columns
        ]

        if missing_columns:
            with batch_lock:
                batch_jobs[job_id]["status"] = "error"
                batch_jobs[job_id]["error"] = (
                    "Missing required columns: "
                    + ", ".join(missing_columns)
                )
            return

        dataframe = dataframe.dropna(
            subset=REQUIRED_COLUMNS
        )

        total = len(dataframe)

        if total == 0:
            with batch_lock:
                batch_jobs[job_id]["status"] = "error"
                batch_jobs[job_id]["error"] = (
                    "No valid transaction rows found."
                )
            return

        with batch_lock:
            batch_jobs[job_id]["total"] = total
            batch_jobs[job_id]["status"] = "processing"

        results = []
        fraud_count = 0
        normal_count = 0
        error_count = 0

        for number, (_, row) in enumerate(
            dataframe.iterrows(),
            start=1,
        ):
            try:
                transaction = {
                    "type": str(
                        row["type"]
                    ).upper(),

                    "amount": float(
                        row["amount"]
                    ),

                    "oldbalanceOrg": float(
                        row["oldbalanceOrg"]
                    ),

                    "newbalanceOrig": float(
                        row["newbalanceOrig"]
                    ),

                    "oldbalanceDest": float(
                        row["oldbalanceDest"]
                    ),

                    "newbalanceDest": float(
                        row["newbalanceDest"]
                    ),
                }

                started = time.perf_counter()

                raw_result = predict_transaction(
                    transaction
                )

                latency_ms = round(
                    (
                        time.perf_counter()
                        - started
                    )
                    * 1000
                )

                prediction, probability = (
                    normalise_prediction(
                        raw_result
                    )
                )

                if prediction == "FRAUD":
                    fraud_count += 1
                else:
                    normal_count += 1

                event_id = str(uuid.uuid4())

                insert_prediction(
                    event_id=event_id,
                    event_time=datetime.now(
                        timezone.utc
                    ).isoformat(),
                    source="batch",
                    transaction=transaction,
                    prediction=prediction,
                    fraud_probability=probability,
                    latency_ms=latency_ms,
                )

                results.append({
                    "id": number,
                    **transaction,
                    "prediction": prediction,
                    "fraud_probability": probability,
                    "latency_ms": latency_ms,
                })

            except Exception as error:
                error_count += 1

                results.append({
                    "id": number,
                    "type": str(
                        row.get(
                            "type",
                            "",
                        )
                    ),
                    "amount": float(
                        row.get(
                            "amount",
                            0,
                        )
                    ),
                    "prediction": "ERROR",
                    "fraud_probability": 0,
                    "error": str(error),
                })

            with batch_lock:
                batch_jobs[job_id]["processed"] = number
                batch_jobs[job_id]["fraud"] = fraud_count
                batch_jobs[job_id]["normal"] = normal_count
                batch_jobs[job_id]["errors"] = error_count
                batch_jobs[job_id]["progress"] = (
                    number / total * 100
                )

        fraud_rate = (
            fraud_count / total * 100
            if total > 0
            else 0
        )

        with batch_lock:
            batch_jobs[job_id]["status"] = "completed"
            batch_jobs[job_id]["progress"] = 100
            batch_jobs[job_id]["results"] = results
            batch_jobs[job_id]["fraud_rate"] = fraud_rate

    except Exception as error:
        with batch_lock:
            batch_jobs[job_id]["status"] = "error"
            batch_jobs[job_id]["error"] = str(error)


@app.post("/batch-start")
async def batch_start(
    file: UploadFile = File(...)
):
    filename = file.filename or ""

    extension = os.path.splitext(
        filename
    )[1].lower()

    if extension not in [
        ".csv",
        ".xlsx",
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only CSV and XLSX files are supported."
            ),
        )

    file_bytes = await file.read()

    job_id = str(uuid.uuid4())

    with batch_lock:
        batch_jobs[job_id] = {
            "job_id": job_id,
            "filename": filename,
            "status": "starting",
            "total": 0,
            "processed": 0,
            "fraud": 0,
            "normal": 0,
            "errors": 0,
            "progress": 0,
            "fraud_rate": 0,
            "results": [],
            "error": None,
        }

    thread = threading.Thread(
        target=process_batch_job,
        args=(
            job_id,
            file_bytes,
            filename,
            extension,
        ),
        daemon=True,
    )

    thread.start()

    return {
        "job_id": job_id,
        "filename": filename,
        "status": "started",
    }


@app.get("/batch-status/{job_id}")
def batch_status(job_id: str):
    with batch_lock:
        job = batch_jobs.get(
            job_id
        )

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Batch job not found.",
            )

        return {
            "job_id": job_id,
            "filename": job["filename"],
            "status": job["status"],
            "total": job["total"],
            "processed": job["processed"],
            "fraud": job["fraud"],
            "normal": job["normal"],
            "errors": job["errors"],
            "progress": job["progress"],
            "error": job["error"],
        }


@app.get("/batch-results/{job_id}")
def batch_results(job_id: str):
    with batch_lock:
        job = batch_jobs.get(
            job_id
        )

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Batch job not found.",
            )

        if job["status"] != "completed":
            raise HTTPException(
                status_code=409,
                detail="Batch job is not complete.",
            )

        return {
            "filename": job["filename"],
            "total_transactions": job["total"],
            "fraud_count": job["fraud"],
            "normal_count": job["normal"],
            "error_count": job["errors"],
            "fraud_rate": job["fraud_rate"],
            "results": job["results"],
        }

