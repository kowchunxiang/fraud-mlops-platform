import { useState } from "react";
import "./App.css";
import LiveMonitor from "./LiveMonitor";
import BatchScreening from "./BatchScreening";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [page, setPage] = useState("overview");
  const [overviewMode, setOverviewMode] = useState("analyze");

  // =========================
  // SINGLE TRANSACTION
  // =========================

  const [form, setForm] = useState({
    type: "TRANSFER",
    amount: "",
    oldbalanceOrg: "",
    newbalanceOrig: "",
    oldbalanceDest: "",
    newbalanceDest: "",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // PAGE NAVIGATION
  // =========================

  function changePage(newPage) {
    setPage(newPage);
  }

  // =========================
  // SINGLE TRANSACTION
  // =========================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type: form.type,
          amount: Number(form.amount),
          oldbalanceOrg: Number(form.oldbalanceOrg),
          newbalanceOrig: Number(form.newbalanceOrig),
          oldbalanceDest: Number(form.oldbalanceDest),
          newbalanceDest: Number(form.newbalanceDest),
        }),
      });

      if (!response.ok) {
        throw new Error("Prediction request failed.");
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      setError(
        "Unable to connect to the prediction service."
      );
    } finally {
      setLoading(false);
    }
  }

  const predictionText =
    String(result?.prediction || "").toUpperCase();

  const isFraud =
    predictionText === "FRAUD" ||
    predictionText === "POTENTIAL FRAUD" ||
    predictionText === "1";

  let probability = 0;

  if (result?.fraud_probability !== undefined) {
    probability = Number(result.fraud_probability);

    if (probability <= 1) {
      probability = probability * 100;
    }
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="page">
      <div className="container">

        {/* HEADER */}

        <header className="header">
          <div className="app-icon">
            F
          </div>

          <div>
            <h1>
              Fraud Detection
            </h1>

            <p>
              Intelligent transaction
              risk monitoring.
            </p>
          </div>
        </header>


        {/* NAVIGATION */}

        {page !== "overview" && (
          <nav className="navigation">

            <button
              className="nav-button"
              onClick={() => changePage("overview")}
            >
              Home
            </button>

            <button
              className={`nav-button ${
                page === "analyze" ? "active" : ""
              }`}
              onClick={() => changePage("analyze")}
            >
              Analyze
            </button>

            <button
              className={`nav-button ${
                page === "live" ? "active" : ""
              }`}
              onClick={() => changePage("live")}
            >
              Live Monitor
            </button>

            <button
              className={`nav-button ${
                page === "batch" ? "active" : ""
              }`}
              onClick={() => changePage("batch")}
            >
              Batch
            </button>

          </nav>
        )}


        {/* =========================
            OVERVIEW
        ========================= */}

        {page === "overview" && (

          <div className="modern-overview">

            {/* HERO */}

            <section className="modern-hero">

              <div>

                <span className="modern-eyebrow">
                  FRAUD DETECTION
                </span>

                <h2>
                  Transaction risk,
                  <br />
                  intelligently detected.
                </h2>

                <p>
                  Machine-learning fraud analysis across individual,
                  live, and batch transactions.
                </p>

              </div>


              <div className="model-ready">

                <span className="ready-dot"></span>

                System Ready

              </div>

            </section>


            {/* DYNAMIC GLASS PANEL */}

            <section className="dynamic-panel">

              {/* SEGMENT CONTROL */}

              <div className="dynamic-tabs">

                <button
                  className={
                    overviewMode === "analyze"
                      ? "dynamic-tab active"
                      : "dynamic-tab"
                  }
                  onClick={() =>
                    setOverviewMode("analyze")
                  }
                >
                  Analyze
                </button>


                <button
                  className={
                    overviewMode === "live"
                      ? "dynamic-tab active"
                      : "dynamic-tab"
                  }
                  onClick={() =>
                    setOverviewMode("live")
                  }
                >
                  Live Monitor
                </button>


                <button
                  className={
                    overviewMode === "batch"
                      ? "dynamic-tab active"
                      : "dynamic-tab"
                  }
                  onClick={() =>
                    setOverviewMode("batch")
                  }
                >
                  Batch
                </button>

              </div>


              {/* ANALYZE */}

              {overviewMode === "analyze" && (

                <div className="dynamic-content">

                  <div className="dynamic-visual analyze-visual">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="6"
                      />

                      <path d="M16 16l4 4" />

                    </svg>

                  </div>


                  <span className="dynamic-label">
                    SINGLE TRANSACTION
                  </span>


                  <h3>
                    Analyze a transaction
                  </h3>


                  <p>
                    Enter transaction details and receive
                    an immediate fraud probability from
                    the machine learning model.
                  </p>


                  <button
                    className="dynamic-open-button"
                    onClick={() =>
                      changePage("analyze")
                    }
                  >
                    Open Analyzer
                    <span>›</span>
                  </button>

                </div>

              )}


              {/* LIVE */}

              {overviewMode === "live" && (

                <div className="dynamic-content">

                  <div className="dynamic-visual live-visual">

                    <span className="pulse-ring"></span>
                    <span className="pulse-core"></span>

                  </div>


                  <span className="dynamic-label live-label">
                    REAL-TIME
                  </span>


                  <h3>
                    Live fraud monitoring
                  </h3>


                  <p>
                    Simulate continuous PaySim transactions
                    and score each transaction as it arrives.
                  </p>


                  <button
                    className="dynamic-open-button"
                    onClick={() =>
                      changePage("live")
                    }
                  >
                    Open Live Monitor
                    <span>›</span>
                  </button>

                </div>

              )}


              {/* BATCH */}

              {overviewMode === "batch" && (

                <div className="dynamic-content">

                  <div className="dynamic-visual batch-visual">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >

                      <rect
                        x="5"
                        y="3"
                        width="14"
                        height="18"
                        rx="2"
                      />

                      <path d="M8 8h8" />
                      <path d="M8 12h8" />
                      <path d="M8 16h5" />

                    </svg>

                  </div>


                  <span className="dynamic-label">
                    FILE SCREENING
                  </span>


                  <h3>
                    Batch fraud screening
                  </h3>


                  <p>
                    Upload CSV or Excel transaction files
                    and analyze large numbers of transactions.
                  </p>


                  <button
                    className="dynamic-open-button"
                    onClick={() =>
                      changePage("batch")
                    }
                  >
                    Open Batch Screening
                    <span>›</span>
                  </button>

                </div>

              )}

            </section>

          </div>

        )}


        {/* =========================
            ANALYZE
        ========================= */}

        {page === "analyze" && (
          <div className="card">

            <div className="card-header">

              <div>
                <h2>
                  Transaction
                </h2>

                <p>
                  Enter the transaction
                  information below.
                </p>
              </div>

              <span className="status">
                ML Model
              </span>

            </div>


            <form
              className="form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="field full-width">

                <label>
                  Transaction Type
                </label>

                <select
                  name="type"
                  value={
                    form.type
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="TRANSFER">
                    Transfer
                  </option>

                  <option value="CASH_OUT">
                    Cash Out
                  </option>

                  <option value="PAYMENT">
                    Payment
                  </option>

                  <option value="CASH_IN">
                    Cash In
                  </option>

                  <option value="DEBIT">
                    Debit
                  </option>

                </select>

              </div>


              <div className="field full-width">

                <label>
                  Amount
                </label>

                <div className="money-input">

                  <span>
                    RM
                  </span>

                  <input
                    type="number"
                    name="amount"
                    value={
                      form.amount
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="10000"
                    required
                  />

                </div>

              </div>


              <div className="section-title">
                Origin Account
              </div>


              <div className="field">

                <label>
                  Previous Balance
                </label>

                <input
                  type="number"
                  name="oldbalanceOrg"
                  value={
                    form.oldbalanceOrg
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="10000"
                  required
                />

              </div>


              <div className="field">

                <label>
                  New Balance
                </label>

                <input
                  type="number"
                  name="newbalanceOrig"
                  value={
                    form.newbalanceOrig
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0"
                  required
                />

              </div>


              <div className="section-title">
                Destination Account
              </div>


              <div className="field">

                <label>
                  Previous Balance
                </label>

                <input
                  type="number"
                  name="oldbalanceDest"
                  value={
                    form.oldbalanceDest
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0"
                  required
                />

              </div>


              <div className="field">

                <label>
                  New Balance
                </label>

                <input
                  type="number"
                  name="newbalanceDest"
                  value={
                    form.newbalanceDest
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0"
                  required
                />

              </div>


              <button
                className="predict-button"
                type="submit"
                disabled={
                  loading
                }
              >

                {loading
                  ? "Analyzing..."
                  : "Analyze Transaction"}

              </button>

            </form>


            {result && (
              <div
                className={`result-box ${
                  isFraud
                    ? "fraud"
                    : "normal"
                }`}
              >

                <div className="result-top">

                  <div>

                    <div className="result-label">
                      Prediction
                    </div>

                    <h3>
                      {isFraud
                        ? "Potential Fraud"
                        : "Normal Transaction"}
                    </h3>

                  </div>


                  <div className="result-icon">
                    {isFraud
                      ? "!"
                      : "✓"}
                  </div>

                </div>


                <div className="probability">

                  <span>
                    Fraud probability
                  </span>

                  <strong>
                    {probability.toFixed(
                      2
                    )}
                    %
                  </strong>

                </div>

              </div>
            )}


            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

          </div>
        )}


        {/* =========================
            LIVE MONITOR
        ========================= */}

        {page === "live" && (
          <LiveMonitor apiUrl={API_URL} />
        )}


        {/* =========================
            BATCH SCREENING
        ========================= */}

        {page === "batch" && (
          <BatchScreening apiUrl={API_URL} />
        )}

      </div>
    </div>
  );
}

export default App;