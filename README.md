# Real-Time Fraud Detection & MLOps Platform

An end-to-end fraud detection platform built with machine learning, FastAPI, React, Apache Kafka, PostgreSQL, MLflow and Docker.

## Architecture

```mermaid
flowchart LR
    A[PaySim Dataset] --> B[Kafka Producer]
    B --> C[Apache Kafka]
    C --> D[Kafka Consumer]
    D --> E[Fraud Detection Model]
    E --> F[PostgreSQL]
    F --> G[FastAPI]
    G --> H[React Live Monitor]

    I[Analyze User] --> J[POST /predict]
    J --> E
    J --> F

    K[CSV / XLSX] --> L[Batch Processing]
    L --> E
    L --> F

    M[Training Pipeline] --> N[MLflow Tracking / Registry]
```

## Features

- XGBoost fraud detection
- FastAPI REST API
- React frontend
- Single transaction analysis
- Kafka-based simulated real-time streaming
- PostgreSQL prediction history
- Live fraud monitoring
- CSV / XLSX batch screening
- Real batch progress tracking
- Fraud probability and prediction latency monitoring
- Downloadable batch results
- MLflow experiment tracking and Model Registry
- Docker Compose
- pytest and GitHub Actions CI

## Runtime Model

The current application loads `models/fraud_model.joblib` through `src/predict.py`.

Single transaction analysis, Kafka live inference and batch screening use the same prediction logic.

MLflow is retained for experiment tracking, registration, versioning and model-management workflows. The current web/API inference path does not load the MLflow `champion` alias.

## Model Inputs

The runtime model uses six transaction fields:

- `type`
- `amount`
- `oldbalanceOrg`
- `newbalanceOrig`
- `oldbalanceDest`
- `newbalanceDest`

## Single Transaction Pipeline

```text
React -> FastAPI /predict -> ML Model -> PostgreSQL
```

Predictions made through the Analyze page are stored with `source = single`.

## Live Monitoring Pipeline

```text
PaySim -> Kafka Producer -> Apache Kafka -> Kafka Consumer -> ML Model -> PostgreSQL -> FastAPI -> React
```

Live predictions are stored with `source = live`.

The live stream replays synthetic PaySim transactions. It is not connected to a real banking transaction network.

## Batch Screening Pipeline

```text
CSV / XLSX -> FastAPI Batch Job -> ML Model -> PostgreSQL -> Results
```

Batch predictions are stored with `source = batch`.

## PostgreSQL

Predictions are stored in the `transactions` table. Stored fields include the transaction source, transaction inputs, prediction, fraud probability, inference latency, event time and database creation time.

## Technology Stack

### Machine Learning
- Python
- XGBoost
- scikit-learn
- Pandas
- joblib
- MLflow

### Backend and Data
- FastAPI
- Apache Kafka
- PostgreSQL
- kafka-python

### Frontend
- React
- Vite
- CSS

### Infrastructure
- Docker
- Docker Compose
- pytest
- GitHub Actions

## Project Structure

```text
fraud-mlops-platform/
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â””â”€â”€ ci.yml
â”œâ”€â”€ frontend/
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ App.jsx
â”‚       â”œâ”€â”€ App.css
â”‚       â”œâ”€â”€ LiveMonitor.jsx
â”‚       â”œâ”€â”€ LiveMonitor.css
â”‚       â”œâ”€â”€ BatchScreening.jsx
â”‚       â””â”€â”€ BatchScreening.css
â”œâ”€â”€ models/
â”‚   â””â”€â”€ fraud_model.joblib
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ api.py
â”‚   â”œâ”€â”€ consumer.py
â”‚   â”œâ”€â”€ db.py
â”‚   â”œâ”€â”€ monitor.py
â”‚   â”œâ”€â”€ predict.py
â”‚   â”œâ”€â”€ predict_registry.py
â”‚   â”œâ”€â”€ producer.py
â”‚   â”œâ”€â”€ register_model.py
â”‚   â””â”€â”€ train.py
â”œâ”€â”€ tests/
â”‚   â””â”€â”€ test_predict.py
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ requirements.txt
â”œâ”€â”€ .gitignore
â””â”€â”€ README.md
```

## Dataset

The project uses the PaySim synthetic mobile-money transaction dataset. The dataset itself is excluded from GitHub because of its size.

For local live simulation, place it at:

```text
data/PS_20174392719_1491204439457_log.csv
```

## Local Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Start Kafka and PostgreSQL:

```powershell
docker compose up -d
```

Start FastAPI:

```powershell
python -m uvicorn src.api:app --host 127.0.0.1 --port 8000
```

The FastAPI application starts the Kafka consumer automatically.

Start React in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

FastAPI docs: `http://127.0.0.1:8000/docs`

To start the PaySim producer, open the Live Monitor page and click **Start Live Simulation**.

## Batch Screening

Supported files:

- CSV
- XLSX

Required columns:

- `type`
- `amount`
- `oldbalanceOrg`
- `newbalanceOrig`
- `oldbalanceDest`
- `newbalanceDest`

## View Recent Database Records

```powershell
docker exec fraud-postgres psql -U fraud_user -d fraud_db -c "SELECT id, source, type, amount, prediction, fraud_probability, latency_ms, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;"
```

## MLflow

MLflow is used for experiment tracking, logged parameters and metrics, model artifacts, Model Registry, model versioning and the optional `champion` alias workflow.

The current React/FastAPI runtime uses `models/fraud_model.joblib`.

## Model Performance

| Metric | Score |
|---|---:|
| Precision | 1.0000 |
| Recall | 0.5424 |
| F2 Score | 0.5970 |
| Decision Threshold | 0.80 |

## Testing

Backend:

```powershell
python -m pytest -q
```

Frontend:

```powershell
cd frontend
npm run build
```

GitHub Actions runs both checks on pushes and pull requests.

## Current Scope

This repository is a portfolio-scale end-to-end fraud detection and MLOps platform.

The live stream uses synthetic PaySim data. The batch-processing job manager runs inside the FastAPI process and is intended for demo/portfolio-scale workloads. A larger production deployment would normally use a dedicated worker or task queue.
