import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import mlflow

DATA_PATH = "data/PS_20174392719_1491204439457_log.csv"

FEATURES = [
    "step",
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
]

TARGET = "isFraud"

df = pd.read_csv(
    DATA_PATH,
    usecols=FEATURES + [TARGET],
    nrows=1000000
)

print(df.head())
print("\nShape:", df.shape)

X = df[FEATURES]
y = df[TARGET]

print("\nX shape:", X.shape)
print("y shape:", y.shape)
print("\nFraud counts:")
print(y.value_counts())

unique_steps = sorted(df["step"].unique())

test_split_position = int(len(unique_steps) * 0.8)
test_split_step = unique_steps[test_split_position]

training_steps = unique_steps[:test_split_position]

val_split_position = int(len(training_steps) * 0.8)
val_split_step = training_steps[val_split_position]

train_mask = df["step"] < val_split_step

val_mask = (
    (df["step"] >= val_split_step)
    & (df["step"] < test_split_step)
)

test_mask = df["step"] >= test_split_step

X_train = X[train_mask]
X_val = X[val_mask]
X_test = X[test_mask]

y_train = y[train_mask]
y_val = y[val_mask]
y_test = y[test_mask]

print("\nValidation split step:", val_split_step)
print("Test split step:", test_split_step)

print(
    "Train step range:",
    X_train["step"].min(),
    "-",
    X_train["step"].max()
)

print(
    "Validation step range:",
    X_val["step"].min(),
    "-",
    X_val["step"].max()
)

print(
    "Test step range:",
    X_test["step"].min(),
    "-",
    X_test["step"].max()
)

print("\nTraining:", X_train.shape)
print("Testing:", X_test.shape)

print("\nTraining fraud:")
print(y_train.value_counts())

print("\nTesting fraud:")
print(y_test.value_counts())

categorical_features = ["type"]

numeric_features = [
    "step",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
]

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ("num", "passthrough", numeric_features)
    ]
)

X_train_ready = preprocessor.fit_transform(X_train)
X_val_ready = preprocessor.transform(X_val)
X_test_ready = preprocessor.transform(X_test)

print("Validation after preprocessing:", X_val_ready.shape)

print("\nBefore preprocessing:", X_train.shape)
print("After preprocessing:", X_train_ready.shape)

model = XGBClassifier(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    random_state=42
)

model.fit(X_train_ready, y_train)

print("\nModel training completed!")

y_pred = model.predict(X_val_ready)

print("\nConfusion Matrix:")
print(confusion_matrix(y_val, y_pred))

print("\nClassification Report:")
print(classification_report(y_val, y_pred, digits=4))

from sklearn.metrics import precision_score, recall_score, f1_score, fbeta_score

y_prob = model.predict_proba(X_val_ready)[:, 1]

thresholds = [0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]

best_threshold = None
best_f2 = -1

print("\nThreshold Comparison:")

for threshold in thresholds:
    y_pred_threshold = (y_prob >= threshold).astype(int)

    precision = precision_score(y_val, y_pred_threshold)
    recall = recall_score(y_val, y_pred_threshold)
    f1 = f1_score(y_val, y_pred_threshold)
    f2 = fbeta_score(y_val, y_pred_threshold, beta=2)

    print(
        f"Threshold={threshold:.2f} | "
        f"Precision={precision:.4f} | "
        f"Recall={recall:.4f} | "
        f"F1={f1:.4f} | "
        f"F2={f2:.4f}"
    )

    if f2 > best_f2:
        best_f2 = f2
        best_threshold = threshold

print("\nBest threshold:", best_threshold)
print("Best F2:", best_f2)

y_val_best = (y_prob >= best_threshold).astype(int)

print("\nBest Threshold Confusion Matrix:")
print(confusion_matrix(y_val, y_val_best))

print("\nBest Threshold Classification Report:")
print(classification_report(y_val, y_val_best, digits=4))

print("\nTrain step range:", X_train["step"].min(), "-", X_train["step"].max())
print("Test step range:", X_test["step"].min(), "-", X_test["step"].max())

candidate_models = [
    {
        "name": "baseline",
        "n_estimators": 100,
        "max_depth": 4,
        "learning_rate": 0.1
    },
    {
        "name": "model_2",
        "n_estimators": 200,
        "max_depth": 4,
        "learning_rate": 0.05
    },
    {
        "name": "model_3",
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.05
    },
    {
        "name": "model_4",
        "n_estimators": 300,
        "max_depth": 5,
        "learning_rate": 0.05
    }
]

best_model = None
best_model_name = None
best_model_threshold = None
best_model_f2 = -1

print("\n===== Model Comparison =====")

for config in candidate_models:

    candidate = XGBClassifier(
        n_estimators=config["n_estimators"],
        max_depth=config["max_depth"],
        learning_rate=config["learning_rate"],
        random_state=42
    )

    candidate.fit(X_train_ready, y_train)

    val_prob = candidate.predict_proba(X_val_ready)[:, 1]

    model_best_f2 = -1
    model_best_threshold = None

    for threshold in thresholds:

        val_pred = (val_prob >= threshold).astype(int)

        f2 = fbeta_score(
            y_val,
            val_pred,
            beta=2
        )

        if f2 > model_best_f2:
            model_best_f2 = f2
            model_best_threshold = threshold

    print(
        config["name"],
        "| threshold:",
        model_best_threshold,
        "| F2:",
        round(model_best_f2, 4)
    )

    if model_best_f2 > best_model_f2:

        best_model_f2 = model_best_f2
        best_model_threshold = model_best_threshold
        best_model = candidate
        best_model_name = config["name"]

print("\nBest model:", best_model_name)
print("Best threshold:", best_model_threshold)
print("Best validation F2:", best_model_f2)

X_train_final = pd.concat([X_train, X_val])
y_train_final = pd.concat([y_train, y_val])

print("\nFinal training data:", X_train_final.shape)
print("Final training fraud:")
print(y_train_final.value_counts())

X_train_final_ready = preprocessor.fit_transform(X_train_final)

final_model = XGBClassifier(
    n_estimators=best_model.get_params()["n_estimators"],
    max_depth=best_model.get_params()["max_depth"],
    learning_rate=best_model.get_params()["learning_rate"],
    random_state=42
)

final_model.fit(X_train_final_ready, y_train_final)

print("\nFinal model training completed!")
print("Final model:", best_model_name)
print("Final threshold:", best_model_threshold)

X_test_final_ready = preprocessor.transform(X_test)

test_prob = final_model.predict_proba(X_test_final_ready)[:, 1]

test_pred = (test_prob >= best_model_threshold).astype(int)

print("\n===== FINAL TEST RESULT =====")

print("\nTest Confusion Matrix:")
print(confusion_matrix(y_test, test_pred))

print("\nTest Classification Report:")
print(classification_report(y_test, test_pred, digits=4))

test_f2 = fbeta_score(y_test, test_pred, beta=2)

print("Final Test F2:", test_f2)

model_bundle = {
    "model": final_model,
    "preprocessor": preprocessor,
    "threshold": best_model_threshold,
    "features": FEATURES
}

joblib.dump(
    model_bundle,
    "models/fraud_model.joblib"
)

print("\nModel saved to models/fraud_model.joblib")

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("fraud-detection")

test_precision = precision_score(y_test, test_pred)
test_recall = recall_score(y_test, test_pred)

with mlflow.start_run(run_name="final-xgboost-model"):

    mlflow.log_param(
        "n_estimators",
        final_model.get_params()["n_estimators"]
    )

    mlflow.log_param(
        "max_depth",
        final_model.get_params()["max_depth"]
    )

    mlflow.log_param(
        "learning_rate",
        final_model.get_params()["learning_rate"]
    )

    mlflow.log_param(
        "threshold",
        best_model_threshold
    )

    mlflow.log_metric(
        "validation_f2",
        best_model_f2
    )

    mlflow.log_metric(
        "test_precision",
        test_precision
    )

    mlflow.log_metric(
        "test_recall",
        test_recall
    )

    mlflow.log_metric(
        "test_f2",
        test_f2
    )

    mlflow.log_artifact(
        "models/fraud_model.joblib"
    )

print("\nMLflow experiment logged!")