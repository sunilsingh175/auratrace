"""
Retrain the Isolation Forest on real telemetry data.
Run manually after collecting enough production events.

Usage:
    docker exec aura_ml_worker python -m ml_anomaly_service.train_model
"""
import asyncio
from collections import defaultdict
from datetime import datetime
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from shared.database import get_db_pool
from shared.config import get_settings
from ml_anomaly_service.feature_extractor import FEATURE_COLUMNS
from ml_anomaly_service.model import MODEL_PATH, SCALER_PATH, MODEL_DIR


async def fetch_training_data(min_samples: int = 50):
    """Fetch recent feature windows from telemetry_events."""
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT payload, event_type
                FROM telemetry_events
                WHERE received_at > NOW() - INTERVAL '7 days'
                LIMIT 50000
                """
            )
    except Exception as e:
        print(f"⚠️ Query error: {e}")
        return None

    if len(rows) < min_samples:
        print(f"⚠️ Only {len(rows)} samples in database — need ≥{min_samples}")
        return None

    buckets = defaultdict(list)
    for idx, r in enumerate(rows):
        buckets[idx % 100].append(r)

    # Build feature vectors
    vectors = []
    for bucket in buckets.values():
        latencies = []
        for r in bucket:
            p = r["payload"]
            if isinstance(p, dict):
                latencies.append(float(p.get("latency_ms") or 0.0))
        events = len(bucket)
        errors = sum(1 for r in bucket if r["event_type"] in ("error", "exception"))
        crashes = sum(1 for r in bucket if r["event_type"] in ("crash", "fatal"))

        if events == 0:
            continue

        vectors.append([
            float(events),
            float(errors),
            float(crashes),
            1.0,
            float(np.mean(latencies)) if latencies else 0.0,
            float(np.max(latencies)) if latencies else 0.0,
            float(np.percentile(latencies, 95)) if latencies else 0.0,
            float(np.std(latencies)) if latencies else 0.0,
            float(events / 60.0),
            float((errors + crashes) / events),
        ])

    return np.array(vectors) if vectors else None


async def retrain():
    settings = get_settings()
    print("📊 Fetching training data...")
    X = await fetch_training_data()

    if X is None or len(X) < 10:
        print("⚠️ Not enough real data — generating synthetic dataset for training...")
        rng = np.random.default_rng(42)
        X = np.column_stack([
            rng.integers(20, 200, 2000),
            rng.integers(0, 5, 2000),
            rng.integers(0, 2, 2000),
            rng.integers(1, 5, 2000),
            rng.normal(120, 30, 2000),
            rng.normal(400, 100, 2000),
            rng.normal(300, 80, 2000),
            rng.normal(50, 20, 2000),
            rng.normal(2.5, 0.8, 2000),
            rng.uniform(0, 0.05, 2000),
        ])

    print(f"✅ Training Isolation Forest on {len(X)} samples")

    scaler = StandardScaler().fit(X)
    contamination = getattr(settings, "ANOMALY_CONTAMINATION", 0.05) or 0.05
    model = IsolationForest(
        contamination=float(contamination),
        n_estimators=200,
        random_state=42,
    ).fit(scaler.transform(X))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    print(f"✅ Model retrained and saved to {MODEL_PATH}")


if __name__ == "__main__":
    asyncio.run(retrain())