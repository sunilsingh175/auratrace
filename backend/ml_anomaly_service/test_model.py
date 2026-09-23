import os
import unittest

import numpy as np

from backend.ml_anomaly_service.model import AnomalyDetector


class TestAnomalyDetector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.detector = AnomalyDetector()

    def test_analyze_returns_consistent_classification(self):
        features = np.array(
            [[0.0, 100.0, 0.0, 80.0, 150.0, 110.0, 0.0, 0.0]],
            dtype=np.float32,
        )

        result = self.detector.analyze(features)

        self.assertIn("anomaly_score", result)
        self.assertIn("is_anomaly", result)
        self.assertEqual(
            result["is_anomaly"],
            result["anomaly_score"] >= float(os.getenv("ANOMALY_THRESHOLD", "0.75")),
        )

    def test_score_is_normalized(self):
        features = np.array(
            [[95.0, 100.0, 0.95, 3200.0, 8000.0, 5000.0, 0.95, 3.0]],
            dtype=np.float32,
        )

        score = self.detector.predict_score(features)

        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_anomalous_window_scores_higher_than_normal(self):
        normal = np.array(
            [[0.0, 100.0, 0.0, 80.0, 150.0, 110.0, 0.0, 0.0]],
            dtype=np.float32,
        )
        anomalous = np.array(
            [[95.0, 100.0, 0.95, 3200.0, 8000.0, 5000.0, 0.95, 3.0]],
            dtype=np.float32,
        )

        self.assertGreater(
            self.detector.predict_score(anomalous),
            self.detector.predict_score(normal),
        )


if __name__ == "__main__":
    unittest.main()
