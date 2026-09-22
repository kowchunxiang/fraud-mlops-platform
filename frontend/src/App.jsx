import { useEffect, useRef, useState } from "react";
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
  // BATCH
  // =========================

  const [batchFile, setBatchFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchJobId, setBatchJobId] = useState(null);
  const [batchProgress, setBatchProgress] = useState({
    status: "idle",
    total: 0,
    processed: 0,
    fraud: 0,
    normal: 0,
    progress: 0,
  });
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState("");

  // =========================
  // LIVE MONITOR
  // =========================

  const [liveRunning, setLiveRunning] = useState(false);

  const [liveSpeed, setLiveSpeed] = useState(1000);

  const [liveTransactions, setLiveTransactions] = useState([]);

  const [liveError, setLiveError] = useState("");

  const [liveStats, setLiveStats] = useState({
    total: 0,
    fraud: 0,
    totalLatency: 0,
  });

  const liveRequestRunning = useRef(false);

  // =========================
  // PAGE NAVIGATION
  // =========================

  function changePage(newPage) {
    if (newPage !== "live") {
      setLiveRunning(false);
    }

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

  // =========================
  // BATCH SCREENING
  // =========================

  async function handleBatchScreening() {

    if (!batchFile) {
      return;
    }

    setBatchLoading(true);

    setBatchResult(null);

    setBatchError("");

    setBatchProgress({
      status: "starting",
      total: 0,
      processed: 0,
      fraud: 0,
      normal: 0,
      progress: 0,
    });


    try {

      const formData =
        new FormData();


      formData.append(
        "file",
        batchFile
      );


      const response =
        await fetch(
          `${API_URL}/batch-start`,
          {
            method: "POST",
            body: formData,
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Unable to start screening."
        );

      }


      setBatchJobId(
        data.job_id
      );


    } catch (error) {

      setBatchLoading(false);

      setBatchError(
        error.message
      );

    }

  }

  function downloadBatchResults() {

    if (
      !batchResult?.results
    ) {
      return;
    }


    const headers = [
      "id",
      "type",
      "amount",
      "oldbalanceOrg",
      "newbalanceOrig",
      "oldbalanceDest",
      "newbalanceDest",
      "fraud_probability",
      "prediction",
    ];


    const rows =
      batchResult.results.map(
        (transaction) =>
          headers.map(
            (header) =>
              transaction[
                header
              ] ?? ""
          )
      );


    const csv = [
      headers.join(","),

      ...rows.map(
        (row) =>
          row.join(",")
      ),

    ].join("\n");


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      "fraud_screening_results.csv";


    link.click();


    URL.revokeObjectURL(
      url
    );

  }

  // =========================
  // BATCH PROGRESS POLLING
  // =========================

  useEffect(() => {

    if (!batchJobId) {
      return;
    }


    let stopped = false;


    const checkProgress =
      async () => {

        try {

          const response =
            await fetch(
              `${API_URL}/batch-status/${batchJobId}`
            );


          const data =
            await response.json();


          if (!response.ok) {

            throw new Error(
              data.detail ||
              "Unable to get progress."
            );

          }


          if (stopped) {
            return;
          }


          setBatchProgress(
            data
          );


          if (
            data.status ===
            "completed"
          ) {

            const resultResponse =
              await fetch(
                `${API_URL}/batch-results/${batchJobId}`
              );


            const resultData =
              await resultResponse.json();


            if (
              !resultResponse.ok
            ) {

              throw new Error(
                resultData.detail ||
                "Unable to get results."
              );

            }


            setBatchResult(
              resultData
            );


            setBatchLoading(
              false
            );


            setBatchJobId(
              null
            );


            return;
          }


          if (
            data.status ===
            "error"
          ) {

            setBatchError(
              data.error ||
              "Batch screening failed."
            );


            setBatchLoading(
              false
            );


            setBatchJobId(
              null
            );


            return;
          }


          if (!stopped) {

            setTimeout(
              checkProgress,
              700
            );

          }


        } catch (error) {

          if (!stopped) {

            setBatchError(
              error.message
            );

            setBatchLoading(
              false
            );

            setBatchJobId(
              null
            );

          }

        }

      };


    checkProgress();


    return () => {
      stopped = true;
    };

  }, [batchJobId]);

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
  // LIVE TRANSACTION GENERATOR
  // =========================

  function generateTransaction(forceRisky = false) {
    const types = [
      "TRANSFER",
      "CASH_OUT",
      "PAYMENT",
      "CASH_IN",
      "DEBIT",
    ];

    // Occasionally generate a transaction pattern
    // that is more unusual so the live demo is interesting.
    const risky =
      forceRisky || Math.random() < 0.15;

    if (risky) {
      const riskyTypes = [
        "TRANSFER",
        "CASH_OUT",
      ];

      const type =
        riskyTypes[
          Math.floor(
            Math.random() *
              riskyTypes.length
          )
        ];

      const amount =
        Math.floor(
          Math.random() * 40000
        ) + 10000;

      const oldbalanceOrg = amount;

      const newbalanceOrig = 0;

      const oldbalanceDest =
        Math.floor(
          Math.random() * 5000
        );

      const newbalanceDest =
        type === "TRANSFER"
          ? oldbalanceDest + amount
          : oldbalanceDest;

      return {
        type,
        amount,
        oldbalanceOrg,
        newbalanceOrig,
        oldbalanceDest,
        newbalanceDest,
      };
    }

    const type =
      types[
        Math.floor(
          Math.random() * types.length
        )
      ];

    const oldbalanceOrg =
      Math.floor(
        Math.random() * 50000
      ) + 1000;

    const maximumAmount =
      Math.min(oldbalanceOrg, 10000);

    const amount =
      Math.floor(
        Math.random() *
          Math.max(maximumAmount, 1)
      ) + 1;

    const oldbalanceDest =
      Math.floor(
        Math.random() * 50000
      );

    let newbalanceOrig =
      oldbalanceOrg;

    let newbalanceDest =
      oldbalanceDest;

    if (
      type === "TRANSFER" ||
      type === "CASH_OUT" ||
      type === "PAYMENT" ||
      type === "DEBIT"
    ) {
      newbalanceOrig = Math.max(
        oldbalanceOrg - amount,
        0
      );
    }

    if (type === "TRANSFER") {
      newbalanceDest =
        oldbalanceDest + amount;
    }

    if (type === "CASH_IN") {
      newbalanceOrig =
        oldbalanceOrg + amount;
    }

    return {
      type,
      amount,
      oldbalanceOrg,
      newbalanceOrig,
      oldbalanceDest,
      newbalanceDest,
    };
  }

  // =========================
  // LIVE PREDICTION
  // =========================

  async function processLiveTransaction(
    forceRisky = false
  ) {
    if (liveRequestRunning.current) {
      return;
    }

    liveRequestRunning.current = true;

    const transaction =
      generateTransaction(forceRisky);

    const startTime =
      performance.now();

    try {
      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            transaction
          ),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Live prediction failed."
        );
      }

      const data =
        await response.json();

      const endTime =
        performance.now();

      const latency =
        Math.round(
          endTime - startTime
        );

      let fraudProbability =
        Number(
          data.fraud_probability || 0
        );

      if (
        fraudProbability <= 1
      ) {
        fraudProbability =
          fraudProbability * 100;
      }

      const prediction =
        String(
          data.prediction || ""
        ).toUpperCase();

      const fraud =
        prediction === "FRAUD" ||
        prediction ===
          "POTENTIAL FRAUD" ||
        prediction === "1";

      const newTransaction = {
        id:
          Date.now() +
          Math.random(),

        time:
          new Date().toLocaleTimeString(),

        ...transaction,

        probability:
          fraudProbability,

        fraud,

        latency,
      };

      setLiveTransactions(
        (previous) => [
          newTransaction,
          ...previous,
        ].slice(0, 30)
      );

      setLiveStats(
        (previous) => ({
          total:
            previous.total + 1,

          fraud:
            previous.fraud +
            (fraud ? 1 : 0),

          totalLatency:
            previous.totalLatency +
            latency,
        })
      );

      setLiveError("");
    } catch (err) {
      console.error(err);

      setLiveError(
        "Unable to connect to the prediction API. Make sure FastAPI is running."
      );

      setLiveRunning(false);
    } finally {
      liveRequestRunning.current =
        false;
    }
  }

  // =========================
  // LIVE LOOP
  // =========================

  useEffect(() => {
    if (!liveRunning) {
      return;
    }

    let cancelled = false;

    let timer = null;

    async function runSimulation() {
      if (cancelled) {
        return;
      }

      await processLiveTransaction();

      if (!cancelled) {
        timer = setTimeout(
          runSimulation,
          liveSpeed
        );
      }
    }

    runSimulation();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    liveRunning,
    liveSpeed,
  ]);

  // =========================
  // RESET LIVE
  // =========================

  function resetLiveSimulation() {
    setLiveRunning(false);

    setLiveTransactions([]);

    setLiveStats({
      total: 0,
      fraud: 0,
      totalLatency: 0,
    });

    setLiveError("");
  }

  const averageLatency =
    liveStats.total > 0
      ? Math.round(
          liveStats.totalLatency /
            liveStats.total
        )
      : null;

  const fraudRate =
    liveStats.total > 0
      ? (
          (liveStats.fraud /
            liveStats.total) *
          100
        ).toFixed(2)
      : "0.00";

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