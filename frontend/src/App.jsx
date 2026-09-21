import { useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

function App() {
  const [form, setForm] = useState({
    type: "TRANSFER",
    amount: "",
    oldbalanceOrg: "",
    newbalanceOrig: "",
    oldbalanceDest: "",
    newbalanceDest: "",
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  async function handlePredict(event) {
    event.preventDefault();

    setResult(null);
    setError("");
    setLoading(true);

    const payload = {
      type: form.type,
      amount: Number(form.amount),
      oldbalanceOrg: Number(form.oldbalanceOrg),
      newbalanceOrig: Number(form.newbalanceOrig),
      oldbalanceDest: Number(form.oldbalanceDest),
      newbalanceDest: Number(form.newbalanceDest),
    };

    try {
      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Prediction request failed"
        );
      }

      const data =
        await response.json();

      setResult(data);

    } catch (error) {
      console.error(
        "Prediction error:",
        error
      );

      setError(
        "Unable to complete prediction. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">

      <div className="container">

        <header className="header">

          <div className="app-icon">
            F
          </div>

          <div>

            <h1>
              Fraud Detection
            </h1>

            <p>
              Analyze a transaction and estimate its fraud risk.
            </p>

          </div>

        </header>


        <section className="card">

          <div className="card-header">

            <div>

              <h2>
                Transaction
              </h2>

              <p>
                Enter the transaction information below.
              </p>

            </div>

            <span className="status">
              ML Model
            </span>

          </div>


          <form
            onSubmit={handlePredict}
            className="form"
          >

            <div className="field full-width">

              <label>
                Transaction Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
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
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
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
                name="oldbalanceOrg"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.oldbalanceOrg
                }
                onChange={
                  handleChange
                }
                placeholder="0.00"
                required
              />

            </div>


            <div className="field">

              <label>
                New Balance
              </label>

              <input
                name="newbalanceOrig"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.newbalanceOrig
                }
                onChange={
                  handleChange
                }
                placeholder="0.00"
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
                name="oldbalanceDest"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.oldbalanceDest
                }
                onChange={
                  handleChange
                }
                placeholder="0.00"
                required
              />

            </div>


            <div className="field">

              <label>
                New Balance
              </label>

              <input
                name="newbalanceDest"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.newbalanceDest
                }
                onChange={
                  handleChange
                }
                placeholder="0.00"
                required
              />

            </div>


            <button
              className="predict-button"
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Analyzing..."
                : "Analyze Transaction"}

            </button>

          </form>


          {error && (

            <div className="error-box">
              {error}
            </div>

          )}


          {result && (

            <div
              className={
                result.prediction === "FRAUD"
                  ? "result-box fraud"
                  : "result-box normal"
              }
            >

              <div className="result-top">

                <div>

                  <span className="result-label">
                    Prediction
                  </span>

                  <h3>

                    {result.prediction === "FRAUD"
                      ? "Potential Fraud"
                      : "Normal Transaction"}

                  </h3>

                </div>


                <div className="result-icon">

                  {result.prediction === "FRAUD"
                    ? "!"
                    : "✓"}

                </div>

              </div>


              <div className="probability">

                <span>
                  Fraud probability
                </span>

                <strong>

                  {(
                    result.fraud_probability *
                    100
                  ).toFixed(2)}

                  %

                </strong>

              </div>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

export default App;