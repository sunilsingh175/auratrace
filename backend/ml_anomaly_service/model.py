"""
Isolation Forest anomaly detector wrapper.
Loads a trained model from disk, or trains a baseline if none exists.
"""
import os
import joblib
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from shared.config import get_settings
from ml_anomaly_service.feature_extractor import FEATURE_COLUMNS

settings = get_settings()

# Model persistence directory (supports both container and local runs)
if os.path.exists("/app"):
    MODEL_DIR = Path("/app/models")
else:
    MODEL_DIR = Path("models")

MODEL_PATH = MODEL_DIR / "isolation_forest.pkl"
SCALER_PATH = MODEL_DIR / "scaler.pkl"


class AnomalyDetector:
    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self._load_or_train()

    # ── Loading ───────────────────────────────────────────

    def _load_or_train(self):
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        if MODEL_PATH.exists() and SCALER_PATH.exists():
            try:
                print("✅ Loading trained model from disk")
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                return
            except Exception as exc:
                print(f"⚠️ Model load failed ({exc}) — retraining baseline")

        print("⚠️  No model found — training baseline on synthetic data")
        self._train_baseline()

    # ── Baseline training ─────────────────────────────────

    def _train_baseline(self, n_samples: int = 5000):
        """
        Train on synthetic 'normal' traffic so the service works
        out-of-the-box. Retrain with real data later.
        """
        rng = np.random.default_rng(42)

        normal = np.column_stack([
            rng.integers(20, 200, n_samples),      # event_count
            rng.integers(0, 5, n_samples),         # error_count
            rng.integers(0, 2, n_samples),         # crash_count
            rng.integers(1, 5, n_samples),         # unique_services
            rng.normal(120, 30, n_samples),        # avg_latency
            rng.normal(400, 100, n_samples),       # max_latency
            rng.normal(300, 80, n_samples),        # p95_latency
            rng.normal(50, 20, n_samples),         # std_latency
            rng.normal(2.5, 0.8, n_samples),       # events_per_second
            rng.uniform(0, 0.05, n_samples),       # error_rate
        ])

        self.scaler = StandardScaler().fit(normal)
        contamination = getattr(settings, "ANOMALY_CONTAMINATION", 0.05) or 0.05
        self.model = IsolationForest(
            contamination=float(contamination),
            n_estimators=200,
            random_state=42,
        ).fit(self.scaler.transform(normal))

        # Persist
        try:
            joblib.dump(self.model, MODEL_PATH)
            joblib.dump(self.scaler, SCALER_PATH)
            print(f"✅ Baseline model trained ({n_samples} samples) and persisted to {MODEL_DIR}")
        except Exception as exc:
            print(f"⚠️ Warning saving model to disk: {exc}")

    # ── Inference ─────────────────────────────────────────

    def score(self, features: dict) -> Tuple[float, bool]:
        """
        Score a feature vector.
        Returns:
            anomaly_score: float in [0,1]  (1 = very anomalous)
            is_anomaly: bool
        """
        if self.model is None or self.scaler is None:
            return 0.85, True

        vec = np.array([[features.get(col, 0.0) for col in FEATURE_COLUMNS]])
        scaled = self.scaler.transform(vec)

        # decision_function: negative = anomalous, positive = normal
        raw = float(self.model.decision_function(scaled)[0])
        pred = int(self.model.predict(scaled)[0])

        # Convert to [0, 1] scale via sigmoid on negation
        # Negative decision_function -> high anomaly score
        anomaly_score = float(1.0 / (1.0 + np.exp(raw * 5.0)))
        anomaly_score = min(max(anomaly_score, 0.0), 1.0)

        # If error_rate or crash_count is high, guarantee high score
        if features.get("crash_count", 0) > 0 or features.get("error_rate", 0) > 0.5:
            anomaly_score = max(anomaly_score, 0.85)

        return float(round(anomaly_score, 3)), (pred == -1 or anomaly_score >= 0.50)


# ── Severity helpers ─────────────────────────────────────

def severity_from_score(score: float) -> str:
    """Map a numeric anomaly score to a severity label."""
    if score >= 0.90:
        return "critical"
    if score >= 0.75:
        return "high"
    if score >= 0.50:
        return "medium"
    return "low"