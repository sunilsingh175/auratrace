import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent))

from evaluate_hdfs import (
    DATASET_PATH,
    load_event_templates,
    transform_events_to_feature_matrix,
)


MODEL_PATH = Path(__file__).resolve().parent / "hdfs_isolation_forest.joblib"


def main():
    print("=" * 72)
    print("HDFS ISOLATION FOREST - TESTING SAVED MODEL")
    print("=" * 72)

    # Load saved model
    print("\nLoading trained model...")
    saved = joblib.load(MODEL_PATH)

    model = saved["model"]
    event_ids = saved["event_ids"]

    print(f"Model: {MODEL_PATH}")
    print(f"Features: {len(event_ids)}")

    # Load the SAME 50,000 samples and SAME random selection
    print("\nLoading HDFS dataset...")

    data = np.load(DATASET_PATH, allow_pickle=True)

    raw_x = data["x_data"]
    raw_y = data["y_data"]

    indices = np.arange(len(raw_x))
    rng = np.random.default_rng(42)
    rng.shuffle(indices)

    selected_indices = indices[:50000]

    x_samples = raw_x[selected_indices]
    y_all = np.asarray(raw_y[selected_indices], dtype=int)

    # Recreate the same 70/30 split
    X = transform_events_to_feature_matrix(
        x_samples,
        event_ids,
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_all,
        test_size=0.30,
        random_state=42,
        stratify=y_all,
    )

    print(f"Training reference set: {len(X_train):,}")
    print(f"Held-out test set:       {len(X_test):,}")
    print(f"Test anomalies:          {np.sum(y_test == 1):,}")

    # Test saved model
    print("\nRunning predictions on held-out test data...")

    raw_predictions = model.predict(X_test)

    y_pred = np.where(
        raw_predictions == -1,
        1,
        0,
    )

    # Isolation Forest: higher anomaly score = more anomalous
    decision_scores = model.decision_function(X_test)
    anomaly_scores = 0.5 - decision_scores

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, anomaly_scores)
    pr_auc = average_precision_score(y_test, anomaly_scores)

    print("\n" + "=" * 72)
    print("OUT-OF-SAMPLE TEST RESULTS")
    print("=" * 72)

    print(f"Test Accuracy:      {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Test ROC-AUC:       {roc_auc:.4f} ({roc_auc * 100:.2f}%)")
    print(f"Test PR-AUC:        {pr_auc:.4f} ({pr_auc * 100:.2f}%)")
    print(f"Precision:          {precision:.4f} ({precision * 100:.2f}%)")
    print(f"Recall:             {recall:.4f} ({recall * 100:.2f}%)")
    print(f"F1-Score:           {f1:.4f} ({f1 * 100:.2f}%)")

    print("\n" + "=" * 72)
    print("TEST COMPLETE")
    print("=" * 72)


if __name__ == "__main__":
    main()
