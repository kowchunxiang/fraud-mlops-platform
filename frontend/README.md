# Fraud Detection Frontend

React + Vite interface for the fraud detection platform.

The frontend provides:

- Single transaction analysis
- Kafka-backed live fraud monitoring
- CSV / XLSX batch screening

Run locally:

```powershell
npm install
npm run dev
```

The frontend uses `VITE_API_URL` when provided, otherwise it connects to `http://127.0.0.1:8000`.
