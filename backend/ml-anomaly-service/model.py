"""
AuraTrace ML Anomaly Detector
Implements Unsupervised Isolation Forest model for metric outlier detection.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from backend.shared.logger import get_logger

logger = get_logger("ml-anomaly-model")


class AnomalyDetector:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=100,
            max_samples="auto",
            random_state=self.random_state,
        )
        self.is_fitted = False
        self._initialize_baseline_model()

    def _initialize_baseline_model(self):
        """
        Generates synthetic healthy baseline training data representing normal service behavior:
        Features: [latency_mean, latency_p95, latency_std, error_ratio, throughput_count]
        """
        np.random.seed(self.random_state)
        n_samples = 1500

        # Normal operational metrics
        latency_mean = np.random.uniform(15.0, 75.0, n_samples)
        latency_p95 = latency_mean + np.random.uniform(10.0, 50.0, n_samples)
        latency_std = np.random.uniform(2.0, 15.0, n_samples)
        error_ratio = np.random.beta(0.5, 50.0, n_samples) * 0.02  # Close to 0% errors
        sample_count = np.random.uniform(50.0, 500.0, n_samples)

        X_train = np.column_stack([
            latency_mean,
            latency_p95,
            latency_std,
            error_ratio,
            sample_count,
        ])

        self.model.fit(X_train)
        self.is_fitted = True
        logger.info("Isolation Forest anomaly detection baseline initialized with %d healthy samples.", n_samples)

    def evaluate_features(self, feature_vec: np.ndarray) -> tuple[bool, float, str]:
        """
        Evaluates a feature vector against the Isolation Forest model and rule heuristics.
        Returns: (is_anomaly, anomaly_score [0.0 - 1.0], reason)
        """
        if not self.is_fitted:
            self._initialize_baseline_model()

        X = feature_vec.reshape(1, -1)
        # raw decision score: negative indicates outlier
        decision_score = self.model.decision_function(X)[0]
        # prediction: -1 for outlier, 1 for inlier
        pred = self.model.predict(X)[0]

        # Normalize score into [0.0, 1.0] where 1.0 is highest anomaly severity
        # decision_function typically ranges from -0.5 (extreme anomaly) to +0.5 (very normal)
        normalized_score = float(np.clip(0.5 - decision_score, 0.0, 1.0))

        # Extract features for rule-based heuristics & explanation
        lat_mean, lat_p95, lat_std, err_ratio, sample_count = feature_vec

        is_anomaly = False
        reason = "Normal baseline operations"

        # Heuristic 1: Error rate spike
        if err_ratio >= 0.10:
            is_anomaly = True
            normalized_score = max(normalized_score, 0.85 + (err_ratio * 0.15))
            reason = f"Critical error rate spike ({err_ratio * 100:.1f}% errors in window)"

        # Heuristic 2: Severe latency degradation
        elif lat_p95 >= 800.0 or lat_mean >= 500.0:
            is_anomaly = True
            normalized_score = max(normalized_score, 0.80)
            reason = f"Severe latency degradation (P95: {lat_p95:.1f}ms, Mean: {lat_mean:.1f}ms)"

        # ML Decision Forest Trigger
        elif pred == -1 or normalized_score > 0.65:
            is_anomaly = True
            reason = f"Isolation Forest statistical anomaly (score: {normalized_score:.2f})"

        normalized_score = min(round(normalized_score, 3), 1.0)
        return is_anomaly, normalized_score, reason
