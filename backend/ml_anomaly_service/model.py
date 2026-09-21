import os
import numpy as np

try:
    import joblib
except ImportError:
    joblib = None


class AnomalyDetector:
    """
    Wrapper around the trained Isolation Forest model.

    IsolationForest decision_function():
        higher value  = more normal
        lower value   = more anomalous

    Trace converts this into:
        0.0 = normal
        1.0 = highly anomalous
    """

    def __init__(self):
        self.model_path_joblib = os.path.join(
            os.path.dirname(__file__),
            "isolation_forest.joblib",
        )

        self.model = None

        self._load_model()

    def _load_model(self):
        """Load the trained Isolation Forest model."""

        if joblib and os.path.exists(
            self.model_path_joblib
        ):
            try:
                self.model = joblib.load(
                    self.model_path_joblib
                )

                print(
                    "Loaded Isolation Forest model from "
                    f"{self.model_path_joblib}"
                )

                return

            except Exception as exc:
                print(
                    "Failed to load joblib model: "
                    f"{exc}"
                )

        print(
            "No trained Isolation Forest model found. "
            "Anomaly detection is running in failsafe mode."
        )

    def _prepare_features(
        self,
        features,
    ) -> np.ndarray:
        """Convert features into model-ready NumPy array."""

        return np.asarray(
            features,
            dtype=float,
        ).reshape(
            1,
            -1,
        )

    def _heuristic_score(
        self,
        features,
    ) -> float:
        """
        Failsafe heuristic scoring when Isolation Forest model is unavailable.
        Evaluates error rate, 5xx rate, latency, and error diversity.
        """
        try:
            arr = np.asarray(
                features,
                dtype=float,
            ).flatten()

            if len(arr) < 8:
                return 0.0

            error_count = arr[0]
            request_count = arr[1]
            error_rate = arr[2]
            avg_latency = arr[3]
            max_latency = arr[4]
            status_5xx_rate = arr[6]
            unique_errors = arr[7]

            score = 0.0
            score += min(0.45, error_rate * 0.45)
            score += min(0.35, status_5xx_rate * 0.35)

            if avg_latency > 2000.0 or max_latency > 5000.0:
                score += 0.15
            elif avg_latency > 500.0:
                score += 0.05

            if error_count > 0:
                score += min(0.10, 0.02 * error_count)
            if unique_errors > 1:
                score += 0.05

            return round(
                min(1.0, max(0.0, score)),
                4,
            )
        except Exception:
            return 0.0

    def predict_score(
        self,
        features,
    ) -> float:
        """
        Return a normalized anomaly score.

        0.0 -> normal
        1.0 -> highly anomalous
        """

        if self.model is None:
            return self._heuristic_score(features)

        try:

            feature_array = (
                self._prepare_features(
                    features
                )
            )

            decision_score = float(
                self.model
                .decision_function(
                    feature_array
                )[0]
            )

            # IsolationForest produces a decision
            # score where higher values are more normal.
            #
            # Convert it to a Trace anomaly score.
            anomaly_score = (
                0.5 - decision_score
            )

            anomaly_score = max(
                0.0,
                min(
                    1.0,
                    anomaly_score,
                ),
            )

            return round(
                anomaly_score,
                4,
            )

        except Exception as exc:

            print(
                "Failed to calculate anomaly score: "
                f"{exc}"
            )

            return self._heuristic_score(features)

    def predict(
        self,
        features,
    ) -> bool:
        """
        Return True when the Trace anomaly
        score crosses the configured threshold.
        """

        score = self.predict_score(
            features
        )

        threshold = float(
            os.getenv(
                "ANOMALY_THRESHOLD",
                "0.75",
            )
        )

        return score >= threshold

    def analyze(
        self,
        features,
    ) -> dict:
        """
        Return the anomaly score and classification.

        The same score is used for both values so that
        Trace has one consistent anomaly decision.
        """

        anomaly_score = (
            self.predict_score(
                features
            )
        )

        threshold = float(
            os.getenv(
                "ANOMALY_THRESHOLD",
                "0.75",
            )
        )

        is_anomaly = (
            anomaly_score >= threshold
        )

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
        }