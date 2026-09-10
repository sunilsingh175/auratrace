import os
import sys
import csv
import time
import pickle
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import joblib
except ImportError:
    joblib = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "scripts", "datasets", "HDFS_v1", "preprocessed", "Event_occurrence_matrix.csv"))
MODEL_PKL_PATH = os.path.join(BASE_DIR, "isolation_forest.pkl")
MODEL_JOBLIB_PATH = os.path.join(BASE_DIR, "isolation_forest.joblib")

def load_hdfs_data(csv_path: str, max_rows: int = None):
    print(f"📂 Loading HDFS Occurrence Matrix from:\n   {csv_path}...", flush=True)
    t0 = time.time()
    
    # Pre-allocate numpy arrays to avoid memory allocations and garbage collection overhead
    total_lines = 575062
    X = np.zeros((total_lines, 29), dtype=np.float32)
    y = np.zeros(total_lines, dtype=np.int64)
    
    valid_count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        header = f.readline().strip().split(",")
        label_idx = header.index("Label")
        e_indices = [i for i, col in enumerate(header) if col.startswith("E") and col[1:].isdigit()]
        
        for line in f:
            if not line.strip():
                continue
            parts = line.strip().split(",")
            lbl = parts[label_idx].lower()
            y[valid_count] = 1 if lbl in ("fail", "anomaly", "1") else 0
            
            for j, e_idx in enumerate(e_indices):
                val = parts[e_idx]
                if val and val != "0":
                    X[valid_count, j] = float(val)
                    
            valid_count += 1
            if max_rows and valid_count >= max_rows:
                break
                
    X = X[:valid_count]
    y = y[:valid_count]
    
    anomalies = int(np.sum(y == 1))
    normals = int(np.sum(y == 0))
    anomaly_rate = float(anomalies / valid_count) if valid_count > 0 else 0.0
    
    print(f" Loaded {valid_count:,} traces in {time.time() - t0:.2f}s with {X.shape[1]} features (E1-E29).", flush=True)
    print(f" Normal traces:    {normals:,} ({normals / valid_count * 100:.2f}%)", flush=True)
    print(f" Anomaly traces:   {anomalies:,} ({anomaly_rate * 100:.2f}%)", flush=True)
    return X, y

def train():
    if not os.path.exists(DATASET_CSV):
        raise FileNotFoundError(f"Dataset not found at {DATASET_CSV}")
        
    X, y = load_hdfs_data(DATASET_CSV)
    
    # 80% Train, 20% Test stratified split
    print("\n Splitting into 80% Train and 20% Test sets (stratified)...", flush=True)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f" Train size: {len(X_train):,} | Test size: {len(X_test):,}", flush=True)
    
    contamination = max(0.01, float(np.mean(y_train)))
    print(f"\n Initializing Isolation Forest (n_estimators=100, max_samples=4096, contamination={contamination:.4f})...", flush=True)
    
    model = IsolationForest(
        n_estimators=100,
        max_samples=4096,
        contamination=contamination,
        random_state=42,
        n_jobs=1
    )
    
    t_train = time.time()
    print(" Training model on HDFS event occurrence patterns...", flush=True)
    model.fit(X_train)
    print(f" Model training completed in {time.time() - t_train:.2f}s.", flush=True)
    
    # Save model artifacts
    if joblib:
        joblib.dump(model, MODEL_JOBLIB_PATH)
        print(f" Saved joblib model: {MODEL_JOBLIB_PATH}", flush=True)
    with open(MODEL_PKL_PATH, "wb") as f:
        pickle.dump(model, f)
    print(f" Saved pickle model: {MODEL_PKL_PATH}", flush=True)
    
    # Evaluate on Test Set
    print(f"\n Evaluating model on holdout test set ({len(X_test):,} traces)...", flush=True)
    t_eval = time.time()
    raw_preds = model.predict(X_test)
    y_pred = np.where(raw_preds == -1, 1, 0)
    print(f" Inference completed in {time.time() - t_eval:.2f}s.", flush=True)
    
    scores = -model.decision_function(X_test)
    
    print("\n" + "=" * 60, flush=True)
    print("                MODEL EVALUATION REPORT (HDFS_v1)", flush=True)
    print("=" * 60, flush=True)
    print(classification_report(y_test, y_pred, target_names=["Normal (0)", "Anomaly (1)"], digits=4), flush=True)
    
    try:
        roc_auc = roc_auc_score(y_test, scores)
        print(f"ROC-AUC Score: {roc_auc:.4f}", flush=True)
    except Exception as e:
        print(f"ROC-AUC calculation skipped: {e}", flush=True)
        
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:", flush=True)
    print(f"  True Normal (TN):  {cm[0][0]:<8} | False Positive (FP): {cm[0][1]}", flush=True)
    print(f"  False Negative (FN):{cm[1][0]:<8} | True Positive (TP):  {cm[1][1]}", flush=True)
    print("=" * 60, flush=True)
    
    return model

if __name__ == "__main__":
    train()

