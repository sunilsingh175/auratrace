"""
Production Telemetry Dataset Generator for AuraTrace
Generates realistic 8-feature rolling window telemetry datasets for training and benchmarking
the live Isolation Forest anomaly detector.

8 Features:
  1. error_count
  2. request_count
  3. error_rate
  4. avg_latency_ms
  5. max_latency_ms
  6. p95_latency_ms
  7. status_5xx_rate
  8. unique_error_types
"""

import os
from pathlib import Path
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "scripts" / "datasets" / "telemetry"
OUTPUT_FILE = OUTPUT_DIR / "production_telemetry.npz"

FEATURE_NAMES = [
    "error_count",
    "request_count",
    "error_rate",
    "avg_latency_ms",
    "max_latency_ms",
    "p95_latency_ms",
    "status_5xx_rate",
    "unique_error_types",
]


def generate_production_dataset(
    n_samples: int = 10000,
    anomaly_ratio: float = 0.15,
    random_seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic telemetry feature matrices representing normal traffic and
    6 realistic operational fault scenarios.
    """
    rng = np.random.default_rng(random_seed)
    n_anomalies = int(n_samples * anomaly_ratio)
    n_normal = n_samples - n_anomalies

    X = np.zeros((n_samples, 8), dtype=np.float32)
    y = np.zeros(n_samples, dtype=np.int32)

    # -------------------------------------------------------------
    # 1. Normal Traffic Distribution (y = 0)
    # -------------------------------------------------------------
    for i in range(n_normal):
        req_count = rng.integers(50, 600)
        # Normal traffic has 0 or minimal occasional client errors (4xx)
        err_count = rng.choice([0, 1, 2, 3], p=[0.75, 0.18, 0.05, 0.02])
        err_rate = err_count / req_count

        avg_lat = rng.normal(45.0, 15.0)
        avg_lat = max(10.0, avg_lat)
        p95_lat = avg_lat * rng.uniform(1.4, 2.2)
        max_lat = p95_lat * rng.uniform(1.2, 2.5)

        status_5xx = 0 if rng.random() > 0.03 else 1
        status_5xx_rate = status_5xx / req_count
        unique_errors = 0 if err_count == 0 else min(err_count, 1)

        X[i] = [
            float(err_count),
            float(req_count),
            float(err_rate),
            float(avg_lat),
            float(max_lat),
            float(p95_lat),
            float(status_5xx_rate),
            float(unique_errors),
        ]
        y[i] = 0

    # -------------------------------------------------------------
    # 2. Realistic Fault Scenarios (y = 1)
    # -------------------------------------------------------------
    for idx, i in enumerate(range(n_normal, n_samples)):
        scenario = idx % 6
        req_count = rng.integers(40, 500)

        if scenario == 0:
            # Fault: Database Connection Pool Exhaustion / Timeout
            err_count = int(req_count * rng.uniform(0.40, 0.95))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(2200.0, 7500.0)
            p95_lat = avg_lat * rng.uniform(1.3, 1.8)
            max_lat = p95_lat * rng.uniform(1.2, 2.0)
            status_5xx_rate = rng.uniform(0.60, 1.0)
            unique_errors = rng.integers(1, 3)

        elif scenario == 1:
            # Fault: Memory Leak / Heavy GC Pause
            err_count = int(req_count * rng.uniform(0.15, 0.45))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(900.0, 3200.0)
            p95_lat = avg_lat * rng.uniform(1.5, 2.5)
            max_lat = rng.uniform(5000.0, 12000.0)
            status_5xx_rate = rng.uniform(0.20, 0.60)
            unique_errors = rng.integers(1, 3)

        elif scenario == 2:
            # Fault: Unhandled Exception Storm / Crash
            err_count = int(req_count * rng.uniform(0.70, 1.0))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(80.0, 400.0)
            p95_lat = avg_lat * rng.uniform(1.2, 2.0)
            max_lat = p95_lat * rng.uniform(1.2, 2.5)
            status_5xx_rate = rng.uniform(0.80, 1.0)
            unique_errors = rng.integers(2, 6)

        elif scenario == 3:
            # Fault: Downstream Microservice Cascade Failure
            err_count = int(req_count * rng.uniform(0.50, 0.85))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(1400.0, 5000.0)
            p95_lat = avg_lat * rng.uniform(1.3, 2.2)
            max_lat = p95_lat * rng.uniform(1.2, 2.0)
            status_5xx_rate = rng.uniform(0.70, 0.95)
            unique_errors = rng.integers(1, 4)

        elif scenario == 4:
            # Fault: Disk Saturation & Resource Lock
            err_count = int(req_count * rng.uniform(0.35, 0.75))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(600.0, 2500.0)
            p95_lat = avg_lat * rng.uniform(1.4, 2.0)
            max_lat = p95_lat * rng.uniform(1.3, 2.5)
            status_5xx_rate = rng.uniform(0.40, 0.85)
            unique_errors = rng.integers(2, 4)

        else:
            # Fault: Thread Exhaustion & Deadlock
            err_count = int(req_count * rng.uniform(0.60, 0.95))
            err_rate = err_count / req_count
            avg_lat = rng.uniform(4000.0, 12000.0)
            p95_lat = avg_lat * rng.uniform(1.2, 1.6)
            max_lat = p95_lat * rng.uniform(1.1, 1.5)
            status_5xx_rate = rng.uniform(0.75, 1.0)
            unique_errors = rng.integers(1, 3)

        X[i] = [
            float(err_count),
            float(req_count),
            float(err_rate),
            float(avg_lat),
            float(max_lat),
            float(p95_lat),
            float(status_5xx_rate),
            float(unique_errors),
        ]
        y[i] = 1

    # Shuffle the dataset
    indices = np.arange(n_samples)
    rng.shuffle(indices)
    X = X[indices]
    y = y[indices]

    return X, y


def main():
    print("=" * 70)
    print("Generating AuraTrace Production Telemetry Dataset (8 Features)")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    X, y = generate_production_dataset(n_samples=12000, anomaly_ratio=0.15)

    np.savez_compressed(
        OUTPUT_FILE,
        X=X,
        y=y,
        feature_names=FEATURE_NAMES,
    )

    print(f"[OK] Total samples:     {len(X):,}")
    print(f"[OK] Normal samples:    {int(np.sum(y == 0)):,}")
    print(f"[OK] Anomalous samples: {int(np.sum(y == 1)):,}")
    print(f"[OK] Feature shape:     {X.shape}")
    print(f"[OK] Saved to:          {OUTPUT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    main()
