import { useEffect, useState } from "react";
import "./BatchScreening.css";


function BatchScreening({ apiUrl }) {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    status: "idle",
    total: 0,
    processed: 0,
    fraud: 0,
    normal: 0,
    progress: 0,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");


  async function startScreening() {
    if (!file) {
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    setProgress({
      status: "starting",
      total: 0,
      processed: 0,
      fraud: 0,
      normal: 0,
      progress: 0,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${apiUrl}/batch-start`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to start batch screening."
        );
      }

      setJobId(data.job_id);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }


  useEffect(() => {
    if (!jobId) {
      return;
    }

    let stopped = false;
    let timer = null;

    async function poll() {
      try {
        const response = await fetch(
          `${apiUrl}/batch-status/${jobId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            "Unable to read batch progress."
          );
        }

        if (stopped) {
          return;
        }

        setProgress(data);

        if (data.status === "completed") {
          const resultResponse = await fetch(
            `${apiUrl}/batch-results/${jobId}`
          );

          const resultData =
            await resultResponse.json();

          if (!resultResponse.ok) {
            throw new Error(
              resultData.detail ||
              "Unable to load batch results."
            );
          }

          setResult(resultData);
          setLoading(false);
          setJobId(null);
          return;
        }

        if (data.status === "error") {
          throw new Error(
            data.error ||
            "Batch screening failed."
          );
        }

        timer = setTimeout(
          poll,
          700
        );

      } catch (err) {
        if (!stopped) {
          setError(err.message);
          setLoading(false);
          setJobId(null);
        }
      }
    }

    poll();

    return () => {
      stopped = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [jobId, apiUrl]);


  function downloadResults() {
    if (!result?.results) {
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
      "latency_ms",
    ];

    const lines = [
      headers.join(","),
      ...result.results.map((row) =>
        headers
          .map((header) => {
            const value =
              row[header] ?? "";

            return JSON.stringify(
              String(value)
            );
          })
          .join(",")
      ),
    ];

    const blob = new Blob(
      [lines.join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      "fraud_screening_results.csv";

    link.click();

    URL.revokeObjectURL(url);
  }


  return (
    <div className="card">

      <div className="card-header">
        <div>
          <h2>Batch Screening</h2>
          <p>
            Analyze multiple transactions from a CSV or Excel file.
          </p>
        </div>

        <span className="status">
          Batch
        </span>
      </div>


      <label className="upload-box">
        <div className="upload-icon">
          ↑
        </div>

        <h3>
          {file
            ? file.name
            : "Upload transaction file"}
        </h3>

        <p>
          CSV, XLS or XLSX
        </p>

        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          disabled={loading}
          onChange={(event) => {
            const nextFile =
              event.target.files[0];

            setFile(
              nextFile || null
            );

            setResult(null);
            setError("");
          }}
        />
      </label>


      {!loading && !result && (
        <button
          className="predict-button batch-button"
          disabled={!file}
          onClick={startScreening}
        >
          Start Batch Screening
        </button>
      )}


      {loading && (
        <div className="ios-batch-progress">

          <div className="batch-progress-top">

            <div className="batch-progress-info">

              <div className="batch-spinner"></div>

              <div>
                <h3>
                  Analyzing {file?.name}
                </h3>

                <p>
                  Screening transactions with the fraud detection model
                </p>
              </div>

            </div>


            <strong className="batch-percentage">
              {Math.round(
                progress.progress || 0
              )}
              %
            </strong>

          </div>


          <div className="ios-progress-track">
            <div
              className="ios-progress-fill"
              style={{
                width:
                  `${progress.progress || 0}%`,
              }}
            ></div>
          </div>


          <div className="batch-progress-bottom">

            <span>
              {progress.total > 0
                ? `${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} transactions`
                : "Preparing transaction file..."}
            </span>

            <span>
              {progress.fraud.toLocaleString()}
              {" "}potential fraud
            </span>

          </div>

        </div>
      )}


      {error && (
        <div className="error-box">
          {error}
        </div>
      )}


      {result && (
        <div className="batch-results">

          <div className="batch-summary-header">
            <div>
              <span className="batch-complete-label">
                SCREENING COMPLETE
              </span>

              <h3>
                Batch Results
              </h3>
            </div>

            <button
              className="download-button"
              onClick={downloadResults}
            >
              Download CSV
            </button>
          </div>


          <div className="batch-stats-grid">

            <div className="batch-stat">
              <span>Transactions</span>
              <strong>
                {result.total_transactions.toLocaleString()}
              </strong>
            </div>

            <div className="batch-stat">
              <span>Normal</span>
              <strong>
                {result.normal_count.toLocaleString()}
              </strong>
            </div>

            <div className="batch-stat">
              <span>Fraud</span>
              <strong>
                {result.fraud_count.toLocaleString()}
              </strong>
            </div>

            <div className="batch-stat">
              <span>Fraud Rate</span>
              <strong>
                {Number(
                  result.fraud_rate
                ).toFixed(2)}
                %
              </strong>
            </div>

          </div>


          <div className="batch-table-section">

            <div className="batch-table-title">
              <span>
                Transaction Results
              </span>

              <span className="batch-count">
                {result.results.length.toLocaleString()}
                {" "}transactions
              </span>
            </div>


            <div className="batch-table-wrapper">

              <table className="batch-table">

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Risk</th>
                    <th>Prediction</th>
                  </tr>
                </thead>


                <tbody>
                  {result.results
                    .slice(0, 100)
                    .map((transaction) => {
                      let risk = Number(
                        transaction.fraud_probability ||
                        0
                      );

                      if (risk <= 1) {
                        risk *= 100;
                      }

                      const fraud =
                        transaction.prediction ===
                        "FRAUD";

                      return (
                        <tr
                          key={transaction.id}
                          className={
                            fraud
                              ? "batch-fraud-row"
                              : ""
                          }
                        >
                          <td>
                            {transaction.id}
                          </td>

                          <td>
                            {transaction.type}
                          </td>

                          <td>
                            RM{" "}
                            {Number(
                              transaction.amount
                            ).toLocaleString()}
                          </td>

                          <td>
                            {risk.toFixed(2)}%
                          </td>

                          <td>
                            <span
                              className={`transaction-status ${
                                fraud
                                  ? "fraud"
                                  : "normal"
                              }`}
                            >
                              {fraud
                                ? "Fraud"
                                : "Normal"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>

              </table>

            </div>


            {result.results.length > 100 && (
              <div className="batch-table-note">
                Showing the first 100 transactions.
                Download the CSV to view all results.
              </div>
            )}

          </div>


          <button
            className="new-batch-button"
            onClick={() => {
              setFile(null);
              setResult(null);
              setProgress({
                status: "idle",
                total: 0,
                processed: 0,
                fraud: 0,
                normal: 0,
                progress: 0,
              });
            }}
          >
            Screen Another File
          </button>

        </div>
      )}

    </div>
  );
}


export default BatchScreening;
