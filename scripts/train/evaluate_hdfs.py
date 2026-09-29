import argparse
import csv
import sys
import time
from pathlib import Path
from typing import Dict, List

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = REPO_ROOT / "scripts" / "datasets" / "HDFS_v1" / "preprocessed" / "HDFS.npz"
TEMPLATES_PATH = REPO_ROOT / "scripts" / "datasets" / "HDFS_v1" / "preprocessed" / "HDFS.log_templates.csv"


def load_event_templates(templates_path: Path) -> List[str]:
    """Load ordered list of HDFS log event template IDs."""
    event_ids = []
    if not templates_path.exists():
        raise FileNotFoundError(f"Event templates file not found: {templates_path}")

    with open(templates_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            event_id = row.get("EventId", "").strip()
            if event_id:
                event_ids.append(event_id)
    return event_ids


def transform_events_to_feature_matrix(
    sequences: np.ndarray, event_ids: List[str]
) -> np.ndarray:
    """Convert sequence of event IDs into count-vector feature matrix."""
    event_index_map = {eid: idx for idx, eid in enumerate(event_ids)}
    num_features = len(event_ids)
    num_samples = len(sequences)

    feature_matrix = np.zeros((num_samples, num_features), dtype=np.float32)

    for i, seq in enumerate(sequences):
        if isinstance(seq, (list, np.ndarray)):
            for event in seq:
                if event in event_index_map:
                    feature_matrix[i, event_index_map[event]] += 1.0
        elif isinstance(seq, str):
            for event in seq.split():
                if event in event_index_map:
                    feature_matrix[i, event_index_map[event]] += 1.0

    return feature_matrix


def evaluate(sample_size: int = 50000, n_trees: int = 100):
    print("=" * 70)
    print("LogHub HDFS_v1 Benchmark Evaluation — AuraTrace Anomaly Engine")
    print("=" * 70)

    event_ids = load_event_templates(TEMPLATES_PATH)
    print(f"Loaded {len(event_ids)} event templates.")

    print(f"Loading dataset from: {DATASET_PATH}")
    data = np.load(DATASET_PATH, allow_pickle=True)
    raw_x, raw_y = data["x_data"], data["y_data"]

    total = len(raw_x)
    print(f"Total traces available: {total:,}")

    indices = np.arange(total)
    rng = np.random.default_rng(42)
    rng.shuffle(indices)
    selected = indices[: min(sample_size, total)]

    x_sample = raw_x[selected]
    y_sample = np.asarray(raw_y[selected], dtype=int)

    print(f"Selected sample size: {len(x_sample):,} (Anomalies: {np.sum(y_sample == 1):,})")

    X = transform_events_to_feature_matrix(x_sample, event_ids)
    print(f"Feature matrix shape: {X.shape}")

    # Strict 80/20 Train/Test split to avoid data leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_sample, test_size=0.20, random_state=42, stratify=y_sample
    )

    contamination = max(0.01, min(0.5, float(np.sum(y_train == 1)) / len(y_train)))
    print(f"Training Isolation Forest on {len(X_train):,} samples (n_estimators={n_trees}, contamination={contamination:.4f})...")

    start_t = time.time()
    model = IsolationForest(
        n_estimators=n_trees,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)
    train_duration = time.time() - start_t

    print(f"Evaluating strictly on {len(X_test):,} unseen test samples...")
    # Predict on unseen test data: -1 = anomaly (1), 1 = normal (0)
    raw_preds = model.predict(X_test)
    y_pred = np.where(raw_preds == -1, 1, 0)
    scores = -model.score_samples(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, scores)
    pr_auc = average_precision_score(y_test, scores)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "-" * 70)
    print("UNSEEN TEST BENCHMARK METRICS SUMMARY (Zero Data Leakage):")
    print("-" * 70)
    print(f"  • Accuracy:         {acc * 100:.2f}%")
    print(f"  • Precision:        {prec * 100:.2f}%")
    print(f"  • Recall:           {rec * 100:.2f}%")
    print(f"  • F1-Score:         {f1 * 100:.2f}%")
    print(f"  • ROC-AUC:          {roc_auc * 100:.2f}%")
    print(f"  • PR-AUC:           {pr_auc * 100:.2f}%")
    print(f"  • Confusion Matrix:\n      TN={cm[0,0]:<6} FP={cm[0,1]:<6}\n      FN={cm[1,0]:<6} TP={cm[1,1]:<6}")
    print(f"  • Training Time:    {train_duration:.2f}s")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate HDFS Isolation Forest Benchmark on Unseen Test Split")
    parser.add_argument("--sample-size", type=int, default=50000, help="Number of samples to evaluate")
    parser.add_argument("--trees", type=int, default=100, help="Number of trees (n_estimators)")
    args = parser.parse_args()

    evaluate(sample_size=args.sample_size, n_trees=args.trees)
