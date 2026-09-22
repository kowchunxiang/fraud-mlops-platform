import { useEffect, useMemo, useState } from "react";
import "./LiveMonitor.css";


function toPercent(value) {
  const number = Number(value || 0);

  return number <= 1
    ? number * 100
    : number;
}


function LiveMonitor({ apiUrl }) {
  const [running, setRunning] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    fraud: 0,
    fraud_rate: 0,
    avg_latency_ms: 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);


  async function refresh() {
    try {
      const [statusResponse, transactionResponse] =
        await Promise.all([
          fetch(`${apiUrl}/live/status`),
          fetch(`${apiUrl}/live/transactions?limit=30`),
        ]);

      if (!statusResponse.ok || !transactionResponse.ok) {
        throw new Error("Unable to load live monitor data.");
      }

      const status = await statusResponse.json();
      const transactionData = await transactionResponse.json();

      setRunning(Boolean(status.running));

      setStats({
        total: Number(status.total || 0),
        fraud: Number(status.fraud || 0),
        fraud_rate: Number(status.fraud_rate || 0),
        avg_latency_ms: Number(status.avg_latency_ms || 0),
      });

      setTransactions(
        transactionData.transactions || []
      );

      if (status.producer_error || status.consumer_error) {
        setError(
          status.producer_error ||
          status.consumer_error
        );
      } else {
        setError("");
      }
    } catch (err) {
      setError(err.message);
    }
  }


  useEffect(() => {
    refresh();

    const timer = setInterval(
      refresh,
      800
    );

    return () => {
      clearInterval(timer);
    };
  }, [apiUrl]);


  async function startSimulation() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/live/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interval_ms: intervalMs,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to start simulation."
        );
      }

      setRunning(true);
      await refresh();

    } catch (err) {
      setError(err.message);

    } finally {
      setBusy(false);
    }
  }


  async function stopSimulation() {
    setBusy(true);

    try {
      await fetch(
        `${apiUrl}/live/stop`,
        {
          method: "POST",
        }
      );

      setRunning(false);
      await refresh();

    } catch (err) {
      setError(err.message);

    } finally {
      setBusy(false);
    }
  }


  async function clearTransactions() {
    setBusy(true);

    try {
      await fetch(
        `${apiUrl}/live/transactions`,
        {
          method: "DELETE",
        }
      );

      await refresh();

    } catch (err) {
      setError(err.message);

    } finally {
      setBusy(false);
    }
  }


  async function changeSpeed(event) {
    const nextValue = Number(
      event.target.value
    );

    setIntervalMs(nextValue);

    if (running) {
      try {
        await fetch(
          `${apiUrl}/live/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              interval_ms: nextValue,
            }),
          }
        );
      } catch (err) {
        setError(err.message);
      }
    }
  }


  const latestRisk = useMemo(() => {
    if (transactions.length === 0) {
      return null;
    }

    return toPercent(
      transactions[0].fraud_probability
    );
  }, [transactions]);


  return (
    <div className="card live-card">

      <div className="card-header">
        <div>
          <h2>Live Fraud Monitor</h2>
          <p>
            PaySim transactions replayed and scored
            by the fraud model.
          </p>
        </div>

        <div
          className={`live-status ${
            running ? "running" : ""
          }`}
        >
          <span className="live-dot"></span>
          {running ? "Live" : "Offline"}
        </div>
      </div>


      <div className="live-controls">

        {!running ? (
          <button
            className="start-live-button"
            onClick={startSimulation}
            disabled={busy}
          >
            ▶ Start Live Simulation
          </button>
        ) : (
          <button
            className="stop-live-button"
            onClick={stopSimulation}
            disabled={busy}
          >
            ■ Stop Simulation
          </button>
        )}


        <select
          value={intervalMs}
          onChange={changeSpeed}
          disabled={busy}
        >
          <option value={2000}>
            0.5 transaction / sec
          </option>

          <option value={1000}>
            1 transaction / sec
          </option>

          <option value={500}>
            2 transactions / sec
          </option>

          <option value={200}>
            5 transactions / sec
          </option>
        </select>


        <button
          className="secondary-live-button"
          onClick={clearTransactions}
          disabled={busy}
        >
          Clear
        </button>

      </div>


      {error && (
        <div className="error-box live-error">
          {error}
        </div>
      )}


      <div className="stats-grid">

        <div className="stat-card">
          <span>Transactions</span>
          <strong>
            {stats.total.toLocaleString()}
          </strong>
        </div>

        <div className="stat-card">
          <span>Fraud Detected</span>
          <strong>
            {stats.fraud.toLocaleString()}
          </strong>
        </div>

        <div className="stat-card">
          <span>Fraud Rate</span>
          <strong>
            {stats.fraud_rate.toFixed(2)}%
          </strong>
        </div>

        <div className="stat-card">
          <span>Avg. Latency</span>
          <strong>
            {stats.total > 0
              ? `${Math.round(stats.avg_latency_ms)} ms`
              : "—"}
          </strong>
        </div>

      </div>


      <div className="live-section">

        <div className="live-section-title">
          <span>Live Transactions</span>

          {running && (
            <span className="streaming-text">
              ● Streaming
            </span>
          )}
        </div>


        {transactions.length === 0 ? (

          <div className="empty-live">
            <div className="empty-live-icon">
              ≋
            </div>

            <h3>No live transactions</h3>

            <p>
              Start the simulation to replay PaySim
              transactions.
            </p>
          </div>

        ) : (

          <div className="transaction-table-wrapper">

            <table className="transaction-table">

              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th>Prediction</th>
                  <th>Latency</th>
                </tr>
              </thead>


              <tbody>
                {transactions.map((transaction) => {
                  const fraud =
                    transaction.prediction === "FRAUD";

                  const risk = toPercent(
                    transaction.fraud_probability
                  );

                  const time = new Date(
                    transaction.event_time
                  ).toLocaleTimeString();

                  return (
                    <tr
                      key={transaction.event_id}
                      className={
                        fraud ? "fraud-row" : ""
                      }
                    >
                      <td>{time}</td>

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

                      <td>
                        {transaction.latency_ms ?? "—"} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>

          </div>

        )}

      </div>


      <div className="simple-status">
        <span className={running ? "status-live" : "status-idle"}>
          ● {running ? "Simulation running" : "Simulation stopped"}
        </span>

        <span>Model pipeline</span>
        <span>Model online</span>
        <span>
          Latest risk:{" "}
          {latestRisk === null
            ? "—"
            : `${latestRisk.toFixed(2)}%`}
        </span>
      </div>

    </div>
  );
}


export default LiveMonitor;
