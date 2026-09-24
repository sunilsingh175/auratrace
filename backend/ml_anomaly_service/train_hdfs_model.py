import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent))

from evaluate_hdfs import (
    DATASET_PATH,
    TEMPLATES_PATH,
    load_event_templates,
    transform_events_to_feature_matrix,
)


MODEL_PATH = Path(__file__).resolve().parent / "hdfs_isolation_forest.joblib"


def main():
    print("=" * 72)
    print("HDFS ISOLATION FOREST - TRAINING")
    print("=" * 72)

    # 1. Load event templates
    event_ids = load_event_templates(TEMPLATES_PATH)

    print(f"\nEvent templates: {len(event_ids)}")
    print(f"Feature space: {len(event_ids)} dimensions")

    # 2. Load HDFS dataset
    print("\nLoading HDFS dataset...")

    data = np.load(DATASET_PATH, allow_pickle=True)

    raw_x = data["x_data"]
    raw_y = data["y_data"]

    print(f"Total HDFS traces: {len(raw_x):,}")

    # Use the same 50,000-sample configuration as your benchmark
    sample_size = 50000

    indices = np.arange(len(raw_x))
    rng = np.random.default_rng(42)
    rng.shuffle(indices)

    selected_indices = indices[:sample_size]

    x_samples = raw_x[selected_indices]
    y_all = np.asarray(raw_y[selected_indices], dtype=int)

    print(f"Samples used: {len(x_samples):,}")
    print(f"Normal: {np.sum(y_all == 0):,}")
    print(f"Anomalous: {np.sum(y_all == 1):,}")

    # 3. Convert event sequences to 29-dimensional features
    print("\nVectorizing HDFS traces...")

    X = transform_events_to_feature_matrix(
        x_samples,
        event_ids,
    )

    print(f"Feature matrix: {X.shape}")

    # 4. Split into training and held-out testing data
    print("\nSplitting dataset 70/30...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_all,
        test_size=0.30,
        random_state=42,
        stratify=y_all,
    )

    print(f"Training samples: {len(X_train):,}")
    print(f"Testing samples:  {len(X_test):,}")

    # 5. Train Isolation Forest
    train_contamination = max(
        0.01,
        min(
            0.5,
            float(np.sum(y_train == 1)) / len(y_train),
        ),
    )

    print("\nTraining Isolation Forest...")
    print(f"Trees: {100}")
    print(f"Contamination: {train_contamination:.4f}")

    model = IsolationForest(
        n_estimators=100,
        contamination=train_contamination,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train)

    print("\nTraining completed.")

    # 6. Save trained model
    joblib.dump(
        {
            "model": model,
            "event_ids": event_ids,
            "feature_count": len(event_ids),
            "random_state": 42,
        },
        MODEL_PATH,
    )

    print("\nModel saved to:")
    print(MODEL_PATH)

    print("\n" + "=" * 72)
    print("TRAINING COMPLETE")
    print("=" * 72)


if __name__ == "__main__":
    main()
