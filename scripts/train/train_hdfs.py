"""
HDFS Isolation Forest Model Training & Export Script
Trains and serializes the HDFS anomaly model to joblib format for inference.
"""

import argparse
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from evaluate_hdfs import (
    DATASET_PATH,
    TEMPLATES_PATH,
    load_event_templates,
    transform_events_to_feature_matrix,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_BENCHMARK_PATH = REPO_ROOT / "models" / "benchmarks" / "hdfs_isolation_forest.joblib"
BACKEND_MODEL_PATH = REPO_ROOT / "backend" / "ml_anomaly_service" / "hdfs_isolation_forest.joblib"


def train_and_save(sample_size: int = 50000, n_trees: int = 100):
    print("=" * 70)
    print("Training HDFS Isolation Forest Benchmark Model for AuraTrace")
    print("=" * 70)

    event_ids = load_event_templates(TEMPLATES_PATH)
    data = np.load(DATASET_PATH, allow_pickle=True)
    raw_x, raw_y = data["x_data"], data["y_data"]

    indices = np.arange(len(raw_x))
    rng = np.random.default_rng(42)
    rng.shuffle(indices)
    selected = indices[: min(sample_size, len(raw_x))]

    x_sample = raw_x[selected]
    y_sample = np.asarray(raw_y[selected], dtype=int)

    X = transform_events_to_feature_matrix(x_sample, event_ids)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_sample, test_size=0.2, random_state=42, stratify=y_sample
    )

    contamination = max(0.01, min(0.5, float(np.sum(y_train == 1)) / len(y_train)))
    print(f"Training on {len(X_train):,} samples with contamination={contamination:.4f}...")

    model = IsolationForest(
        n_estimators=n_trees,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)

    OUTPUT_BENCHMARK_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, OUTPUT_BENCHMARK_PATH)
    joblib.dump(model, BACKEND_MODEL_PATH)
    print(f"[OK] Model successfully trained and saved to: {OUTPUT_BENCHMARK_PATH}")
    print(f"[OK] Copied to backend: {BACKEND_MODEL_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train and save HDFS Isolation Forest model")
    parser.add_argument("--sample-size", type=int, default=50000)
    parser.add_argument("--trees", type=int, default=100)
    args = parser.parse_args()

    train_and_save(sample_size=args.sample_size, n_trees=args.trees)
