"""
AuraTrace HDFS Anomaly Detection Model Trainer & Benchmark Evaluator
Trains the offline research benchmark Isolation Forest model on the LogHub HDFS_v1 dataset,
evaluates out-of-sample generalization across multiple contamination experiments,
and persists both the trained model artifact and measured metrics.

Dataset Citation:
Wei Xu, Ling Huang, Armando Fox, David Patterson, Michael Jordan.
"Detecting Large-Scale System Problems by Mining Console Logs", SOSP 2009.
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from collections import Counter

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
)

BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BASE_DIR.parent.parent
DATASET_PATH = WORKSPACE_DIR / "scripts" / "datasets" / "HDFS_v1" / "preprocessed" / "HDFS.npz"
TEMPLATES_PATH = WORKSPACE_DIR / "scripts" / "datasets" / "HDFS_v1" / "preprocessed" / "HDFS.log_templates.csv"
MODEL_OUTPUT_PATH = BASE_DIR / "hdfs_isolation_forest.joblib"
METRICS_OUTPUT_PATH = BASE_DIR / "model_metrics.json"


def load_event_templates(templates_path: Path) -> list:
    """Load the 29 event template IDs from CSV."""
    event_ids = []
    if templates_path.exists():
        with open(templates_path, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                if idx == 0 or not line.strip():
                    continue
                parts = line.strip().split(",", 1)
                event_ids.append(parts[0].strip())
    else:
        event_ids = [f"E{i}" for i in range(1, 30)]
    return sorted(
        list(set(event_ids)),
        key=lambda x: int(x.replace("E", "")) if x.replace("E", "").isdigit() else 999,
    )


def transform_events_to_feature_matrix(event_traces, event_ids: list) -> np.ndarray:
    """Convert sequence of event IDs per session into a 29-dimensional occurrence count matrix."""
    event_to_idx = {eid: idx for idx, eid in enumerate(event_ids)}
    n_features = len(event_ids)
    n_samples = len(event_traces)

    feature_matrix = np.zeros((n_samples, n_features), dtype=np.float32)

    for i, trace in enumerate(event_traces):
        if not trace:
            continue
        counts = Counter(trace)
        for eid, count in counts.items():
            if eid in event_to_idx:
                feature_matrix[i, event_to_idx[eid]] = float(count)

    return feature_matrix


def train_and_evaluate_hdfs(
    sample_size: int = 50000,
    test_size: float = 0.30,
    n_estimators: int = 100,
    random_state: int = 42,
    save_artifacts: bool = True,
) -> dict:
    """
    Executes full HDFS benchmark training and dual experiment evaluation:
    - Experiment A: Empirical Contamination rate (derived from training data)
    - Experiment B: Independent Fixed Contamination (0.05 / 5% standard prior)
    """
    print("=" * 76)
    print(" 🌲 AuraTrace ML Benchmark: HDFS Isolation Forest Training & Evaluation")
    print(f" Dataset Location: {DATASET_PATH}")
    print("=" * 76)

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"HDFS dataset file not found at {DATASET_PATH}")

    # 1. Load Templates and Dataset
    event_ids = load_event_templates(TEMPLATES_PATH)
    print(f"• Identified {len(event_ids)} distinct log event templates (E1..E{len(event_ids)}).")

    print(f"• Loading HDFS_v1 dataset (evaluating {sample_size if sample_size > 0 else 'all 575,061'} samples)...")
    t0 = time.perf_counter()
    data = np.load(DATASET_PATH, allow_pickle=True)
    raw_x = data["x_data"]
    raw_y = data["y_data"]

    total_available = len(raw_x)
    if sample_size > 0 and sample_size < total_available:
        indices = np.arange(total_available)
        np.random.seed(random_state)
        np.random.shuffle(indices)
        selected_indices = indices[:sample_size]
        x_samples = raw_x[selected_indices]
        y_all = np.array(raw_y[selected_indices], dtype=int)
    else:
        x_samples = raw_x
        y_all = np.array(raw_y, dtype=int)

    load_time = time.perf_counter() - t0
    n_samples = len(x_samples)
    normal_count = int(np.sum(y_all == 0))
    anomaly_count = int(np.sum(y_all == 1))
    empirical_contamination = anomaly_count / max(1, n_samples)

    print(f"  └ Loaded {n_samples:,} session traces in {load_time:.2f}s")
    print(f"    - Normal Sessions:    {normal_count:,} ({normal_count/n_samples*100:.2f}%)")
    print(f"    - Anomalous Sessions: {anomaly_count:,} ({anomaly_count/n_samples*100:.2f}%)")
    print(f"    - Empirical Rate:     {empirical_contamination:.4f} ({empirical_contamination*100:.2f}%)")

    # 2. Vectorize Features
    print(f"\n• Vectorizing session event traces into {len(event_ids)}-dimensional feature matrix...")
    t1 = time.perf_counter()
    X = transform_events_to_feature_matrix(x_samples, event_ids)
    vec_time = time.perf_counter() - t1
    print(f"  └ Feature matrix shape: {X.shape} (constructed in {vec_time:.2f}s)")

    # 3. Stratified Partition
    print(f"\n• Partitioning dataset: {(1-test_size)*100:.0f}% Training / {test_size*100:.0f}% Held-Out Testing...")
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_all,
        test_size=test_size,
        random_state=random_state,
        stratify=y_all,
    )
    print(f"  ├ Training set: {len(X_train):,} samples (Unsupervised training without labels)")
    print(f"  └ Test set:     {len(X_test):,} samples ({int(np.sum(y_test==1)):,} ground-truth anomalies)")

    results = {
        "dataset": "HDFS_v1",
        "benchmark": "LogHub Console Log Anomaly Detection",
        "algorithm": "IsolationForest",
        "total_evaluated_samples": n_samples,
        "features_count": len(event_ids),
        "features": event_ids,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "test_size": test_size,
        "n_estimators": n_estimators,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
        "experiments": {},
    }

    # =========================================================================
    # Experiment A: Empirical Contamination Rate
    # =========================================================================
    train_contamination = max(0.01, min(0.5, float(np.sum(y_train == 1)) / len(y_train)))
    print(f"\n[Experiment A] Training with Empirical Contamination (contamination={train_contamination:.4f})...")
    t2 = time.perf_counter()
    clf_a = IsolationForest(
        n_estimators=n_estimators,
        contamination=train_contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    clf_a.fit(X_train)
    train_time_a = time.perf_counter() - t2

    t3 = time.perf_counter()
    preds_a = np.where(clf_a.predict(X_test) == -1, 1, 0)
    scores_a = 0.5 - clf_a.decision_function(X_test)
    infer_time_a = time.perf_counter() - t3

    prec_a = precision_score(y_test, preds_a, zero_division=0)
    rec_a = recall_score(y_test, preds_a, zero_division=0)
    f1_a = f1_score(y_test, preds_a, zero_division=0)
    roc_a = roc_auc_score(y_test, scores_a)
    pr_a = average_precision_score(y_test, scores_a)
    cm_a = confusion_matrix(y_test, preds_a)
    tn_a, fp_a, fn_a, tp_a = cm_a.ravel() if cm_a.shape == (2, 2) else (0, 0, 0, 0)

    results["experiments"]["experiment_a_empirical_contamination"] = {
        "description": "Isolation Forest configured with empirical training split contamination",
        "contamination": round(train_contamination, 4),
        "roc_auc": round(float(roc_a), 4),
        "pr_auc": round(float(pr_a), 4),
        "precision": round(float(prec_a), 4),
        "recall": round(float(rec_a), 4),
        "f1_score": round(float(f1_a), 4),
        "training_time_seconds": round(train_time_a, 2),
        "inference_velocity_sessions_per_sec": round(len(X_test) / infer_time_a, 1),
        "confusion_matrix": {
            "true_positives": int(tp_a),
            "false_positives": int(fp_a),
            "true_negatives": int(tn_a),
            "false_negatives": int(fn_a),
        },
    }

    # =========================================================================
    # Experiment B: Fixed Unsupervised Contamination Prior (0.05)
    # =========================================================================
    fixed_contamination = 0.05
    print(f"\n[Experiment B] Training with Fixed Prior Contamination (contamination={fixed_contamination:.2f})...")
    t4 = time.perf_counter()
    clf_b = IsolationForest(
        n_estimators=n_estimators,
        contamination=fixed_contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    clf_b.fit(X_train)
    train_time_b = time.perf_counter() - t4

    t5 = time.perf_counter()
    preds_b = np.where(clf_b.predict(X_test) == -1, 1, 0)
    scores_b = 0.5 - clf_b.decision_function(X_test)
    infer_time_b = time.perf_counter() - t5

    prec_b = precision_score(y_test, preds_b, zero_division=0)
    rec_b = recall_score(y_test, preds_b, zero_division=0)
    f1_b = f1_score(y_test, preds_b, zero_division=0)
    roc_b = roc_auc_score(y_test, scores_b)
    pr_b = average_precision_score(y_test, scores_b)
    cm_b = confusion_matrix(y_test, preds_b)
    tn_b, fp_b, fn_b, tp_b = cm_b.ravel() if cm_b.shape == (2, 2) else (0, 0, 0, 0)

    results["experiments"]["experiment_b_fixed_prior_contamination"] = {
        "description": "Isolation Forest configured with standard fixed 5% contamination prior",
        "contamination": fixed_contamination,
        "roc_auc": round(float(roc_b), 4),
        "pr_auc": round(float(pr_b), 4),
        "precision": round(float(prec_b), 4),
        "recall": round(float(rec_b), 4),
        "f1_score": round(float(f1_b), 4),
        "training_time_seconds": round(train_time_b, 2),
        "inference_velocity_sessions_per_sec": round(len(X_test) / infer_time_b, 1),
        "confusion_matrix": {
            "true_positives": int(tp_b),
            "false_positives": int(fp_b),
            "true_negatives": int(tn_b),
            "false_negatives": int(fn_b),
        },
    }

    # Summary Display
    print("\n" + "=" * 76)
    print(" 📊 HDFS BENCHMARK EVALUATION RESULTS SUMMARY")
    print("=" * 76)
    print(f" {'Metric':<22} | {'Experiment A (Empirical)':<24} | {'Experiment B (Fixed 5%)':<22}")
    print("-" * 76)
    print(f" {'Contamination':<22} | {train_contamination*100:>23.2f}% | {fixed_contamination*100:>21.2f}%")
    print(f" {'ROC-AUC Score':<22} | {roc_a*100:>23.2f}% | {roc_b*100:>21.2f}%")
    print(f" {'PR-AUC (Avg Prec)':<22} | {pr_a*100:>23.2f}% | {pr_b*100:>21.2f}%")
    print(f" {'Precision':<22} | {prec_a*100:>23.2f}% | {prec_b*100:>21.2f}%")
    print(f" {'Recall':<22} | {rec_a*100:>23.2f}% | {rec_b*100:>21.2f}%")
    print(f" {'F1-Score':<22} | {f1_a*100:>23.2f}% | {f1_b*100:>21.2f}%")
    print(f" {'Inference Velocity':<22} | {len(X_test)/infer_time_a:>19.1f} s/s | {len(X_test)/infer_time_b:>17.1f} s/s")
    print("=" * 76)

    # Persist Artifacts
    if save_artifacts:
        joblib.dump(clf_a, MODEL_OUTPUT_PATH)
        print(f"💾 Saved HDFS Isolation Forest model -> {MODEL_OUTPUT_PATH}")

        with open(METRICS_OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print(f"📄 Saved HDFS Benchmark metrics JSON -> {METRICS_OUTPUT_PATH}")

        # Verify load
        loaded_clf = joblib.load(MODEL_OUTPUT_PATH)
        assert hasattr(loaded_clf, "predict"), "Loaded model validation failed!"
        print("✓ Confirmed saved model artifact is valid and reloadable.")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train and evaluate Isolation Forest on HDFS benchmark.")
    parser.add_argument("--samples", type=int, default=50000, help="Sample size (default: 50000, 0 for all 575k)")
    parser.add_argument("--test-size", type=float, default=0.30, help="Held-out test split ratio (default: 0.30)")
    parser.add_argument("--trees", type=int, default=100, help="Number of estimators in forest")
    args = parser.parse_args()

    train_and_evaluate_hdfs(
        sample_size=args.samples,
        test_size=args.test_size,
        n_estimators=args.trees,
    )
