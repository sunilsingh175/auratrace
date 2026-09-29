"""
Production Isolation Forest Model Evaluation Script
Evaluates trained production model strictly on unseen test split of the 8-feature telemetry dataset.
Reports Precision, Recall, F1-Score, ROC-AUC, PR-AUC, and Confusion Matrix.
"""

import argparse
import time
from pathlib import Path

import joblib
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

from generate_production_dataset import (
    FEATURE_NAMES,
    OUTPUT_FILE as TELEMETRY_DATASET_PATH,
    generate_production_dataset,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROD_MODEL_PATH = REPO_ROOT / "models" / "production" / "isolation_forest.joblib"


def evaluate(n_trees: int = 100, random_seed: int = 42):
    print("=" * 70)
    print("AuraTrace Production ML Model Evaluation (Zero Data Leakage)")
    print("=" * 70)

    # 1. Load dataset
    if not TELEMETRY_DATASET_PATH.exists():
        print(f"Dataset not found at {TELEMETRY_DATASET_PATH}. Generating...")
        TELEMETRY_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        X, y = generate_production_dataset(n_samples=12000, anomaly_ratio=0.15, random_seed=random_seed)
        np.savez_compressed(TELEMETRY_DATASET_PATH, X=X, y=y, feature_names=FEATURE_NAMES)
    else:
        data = np.load(TELEMETRY_DATASET_PATH, allow_pickle=True)
        X, y = data["X"], data["y"]

    total = len(X)
    print(f"Total dataset samples: {total:,} (Anomalies: {int(np.sum(y == 1)):,})")

    # 2. Strict 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_seed, stratify=y
    )
    print(f"Train split: {len(X_train):,} samples | Unseen Test split: {len(X_test):,} samples")

    # 3. Load or train model
    if PROD_MODEL_PATH.exists():
        print(f"Loading trained production model from: {PROD_MODEL_PATH}")
        model = joblib.load(PROD_MODEL_PATH)
    else:
        print(f"Trained model not found at {PROD_MODEL_PATH}. Training on train split...")
        contamination = max(0.01, min(0.5, float(np.sum(y_train == 1)) / len(y_train)))
        model = IsolationForest(
            n_estimators=n_trees,
            contamination=contamination,
            random_state=random_seed,
            n_jobs=-1,
        )
        model.fit(X_train)

    # 4. Evaluate strictly on unseen test set
    start_eval = time.time()
    raw_preds = model.predict(X_test)
    y_pred = np.where(raw_preds == -1, 1, 0)
    scores = -model.score_samples(X_test)
    eval_duration = time.time() - start_eval

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, scores)
    pr_auc = average_precision_score(y_test, scores)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "-" * 70)
    print("PRODUCTION MODEL EVALUATION METRICS SUMMARY (Unseen Test Set):")
    print("-" * 70)
    print(f"  • Evaluated Features:  8 (error_count, request_count, error_rate, latencies...)")
    print(f"  • Test Sample Size:    {len(X_test):,}")
    print(f"  • Accuracy:            {acc * 100:.2f}%")
    print(f"  • Precision:           {prec * 100:.2f}%")
    print(f"  • Recall:              {rec * 100:.2f}%")
    print(f"  • F1-Score:            {f1 * 100:.2f}%")
    print(f"  • ROC-AUC:             {roc_auc * 100:.2f}%")
    print(f"  • PR-AUC:              {pr_auc * 100:.2f}%")
    print(f"  • Confusion Matrix:\n      TN={cm[0,0]:<6} FP={cm[0,1]:<6}\n      FN={cm[1,0]:<6} TP={cm[1,1]:<6}")
    print(f"  • Inference Duration:  {eval_duration * 1000:.2f}ms")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Production Isolation Forest on Unseen Test Split")
    parser.add_argument("--trees", type=int, default=100, help="Number of trees (n_estimators)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    evaluate(n_trees=args.trees, random_seed=args.seed)
