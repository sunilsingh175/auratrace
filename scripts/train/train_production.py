"""
Production Isolation Forest Model Training & Serialization Script
Trains on 80% train split of 8-feature production telemetry dataset and serializes to joblib format.
"""

import argparse
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

from generate_production_dataset import (
    FEATURE_NAMES,
    OUTPUT_FILE as TELEMETRY_DATASET_PATH,
    generate_production_dataset,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROD_MODEL_DIR = REPO_ROOT / "models" / "production"
OUTPUT_PROD_MODEL = PROD_MODEL_DIR / "isolation_forest.joblib"
BACKEND_MODEL_PATH = REPO_ROOT / "backend" / "ml_anomaly_service" / "isolation_forest.joblib"


def train_and_save(n_trees: int = 100, random_seed: int = 42):
    print("=" * 70)
    print("Training AuraTrace Production Isolation Forest Model (8 Features)")
    print("=" * 70)

    # 1. Load or generate dataset
    if not TELEMETRY_DATASET_PATH.exists():
        print(f"Dataset not found at {TELEMETRY_DATASET_PATH}. Generating...")
        TELEMETRY_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        X, y = generate_production_dataset(n_samples=12000, anomaly_ratio=0.15, random_seed=random_seed)
        np.savez_compressed(TELEMETRY_DATASET_PATH, X=X, y=y, feature_names=FEATURE_NAMES)
    else:
        data = np.load(TELEMETRY_DATASET_PATH, allow_pickle=True)
        X, y = data["X"], data["y"]

    print(f"Loaded dataset: {len(X):,} samples (Anomalies: {int(np.sum(y == 1)):,})")

    # 2. Strict 80/20 train/test split to prevent leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_seed, stratify=y
    )

    contamination = max(0.01, min(0.5, float(np.sum(y_train == 1)) / len(y_train)))
    print(f"Training on {len(X_train):,} samples with contamination={contamination:.4f}...")

    # 3. Train Isolation Forest
    model = IsolationForest(
        n_estimators=n_trees,
        contamination=contamination,
        random_state=random_seed,
        n_jobs=-1,
    )
    model.fit(X_train)

    # 4. Save to models/production/ and backend/ml_anomaly_service/
    PROD_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, OUTPUT_PROD_MODEL)
    joblib.dump(model, BACKEND_MODEL_PATH)

    print(f"[OK] Production model successfully trained and saved to: {OUTPUT_PROD_MODEL}")
    print(f"[OK] Backend model copy updated at:                     {BACKEND_MODEL_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train and export AuraTrace Production Isolation Forest")
    parser.add_argument("--trees", type=int, default=100, help="Number of trees (n_estimators)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    train_and_save(n_trees=args.trees, random_seed=args.seed)

