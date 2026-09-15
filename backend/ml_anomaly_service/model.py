import os
import pickle

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

    AuraTrace converts this into:
        0.0 = normal
        1.0 = highly anomalous
    """

    def __init__(self):
        self.model_path_pkl = os.path.join(
            os.path.dirname(__file__),
            "isolation_forest.pkl",
        )

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

        if os.path.exists(
            self.model_path_pkl
        ):
            try:
                with open(
                    self.model_path_pkl,
                    "rb",
                ) as file:

                    self.model = pickle.load(
                        file
                    )

                print(
                    "Loaded Isolation Forest model from "
                    f"{self.model_path_pkl}"
                )

                return

            except Exception as exc:
                print(
                    "Failed to load pickle model: "
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
            return 0.0

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
            # Convert it to an AuraTrace anomaly score.
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

            return 0.0

    def predict(
        self,
        features,
    ) -> bool:
        """
        Return True when the AuraTrace anomaly
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
        AuraTrace has one consistent anomaly decision.
        """

        if self.model is None:

            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
            }

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