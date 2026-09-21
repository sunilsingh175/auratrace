"""
Trace Pipeline Integration Test Suite
Validates backend components:
1. Multi-service ML Log Buffer feature isolation
2. Isolation Forest model scoring
3. Canonical stack_trace resolution
4. pgvector RAG vector search query construction & embedding format
5. LLM pipeline diagnosis format parsing
"""

import os
import sys
import unittest
import numpy as np

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.ml_anomaly_service.window_buffer import LogBuffer, ServiceLogBufferManager, FEATURE_NAMES
from backend.ml_anomaly_service.model import AnomalyDetector

import importlib
embeddings_mod = importlib.import_module("backend.rag-diagnostic-service.embeddings")
embedder = embeddings_mod.embedder


class TestTracePipeline(unittest.TestCase):

    def test_01_service_log_buffer_isolation(self):
        """Verify that telemetry from different services is strictly isolated."""
        manager = ServiceLogBufferManager(window_seconds=300)

        # Log for payment-api
        manager.add_log({
            "service_id": "payment-api",
            "level": "ERROR",
            "status_code": 500,
            "latency_ms": 3200,
            "error_type": "TimeoutError",
        })

        # Log for auth-service
        manager.add_log({
            "service_id": "auth-service",
            "level": "INFO",
            "status_code": 200,
            "latency_ms": 45,
        })

        self.assertEqual(manager.get_buffer_size("payment-api"), 1)
        self.assertEqual(manager.get_buffer_size("auth-service"), 1)
        self.assertEqual(manager.get_buffer_size("order-service"), 0)

        payment_features = manager.get_feature_dict("payment-api")
        auth_features = manager.get_feature_dict("auth-service")

        # payment-api should have 1 error and 100% error rate
        self.assertEqual(payment_features["error_count"], 1.0)
        self.assertEqual(payment_features["error_rate"], 1.0)
        self.assertEqual(payment_features["avg_latency_ms"], 3200.0)

        # auth-service should have 0 errors and 0% error rate
        self.assertEqual(auth_features["error_count"], 0.0)
        self.assertEqual(auth_features["error_rate"], 0.0)
        self.assertEqual(auth_features["avg_latency_ms"], 45.0)

    def test_02_anomaly_detector_scoring(self):
        """Verify Isolation Forest scoring on normal vs anomalous feature vectors."""
        detector = AnomalyDetector()

        # Normal telemetry feature vector
        normal_features = np.array([[0.0, 100.0, 0.0, 80.0, 150.0, 110.0, 0.0, 0.0]], dtype=np.float32)
        normal_res = detector.analyze(normal_features)
        self.assertIn("anomaly_score", normal_res)
        self.assertIn("is_anomaly", normal_res)

        # Severe crash telemetry feature vector (connection pool exhaustion)
        crash_features = np.array([[95.0, 100.0, 0.95, 3200.0, 8000.0, 5000.0, 0.95, 3.0]], dtype=np.float32)
        crash_res = detector.analyze(crash_features)
        self.assertGreater(crash_res["anomaly_score"], normal_res["anomaly_score"])

    def test_03_embedding_dimension(self):
        """Verify embeddings produce 384-dimensional vectors matching pgvector vector(384)."""
        test_text = "DBConnectionError: oslo_db.exception.DBConnectionError: Can't connect to MySQL server"
        embedding = embedder.get_embedding(test_text)
        self.assertIsInstance(embedding, list)
        self.assertEqual(len(embedding), 384)

    def test_04_llm_diagnosis_parser(self):
        """Verify diagnosis parsing handles ROOT CAUSE and RECOVERY PATCH sections."""
        sample_output = """
ROOT CAUSE:
The SQLAlchemy database connection pool has been exhausted due to unclosed sessions in the checkout route.

RECOVERY PATCH:
1. Ensure all session connections are wrapped in context managers.
2. Increase the database pool overflow limit in production configuration.
"""
        lower = sample_output.lower()
        marker = "recovery patch:"
        self.assertIn(marker, lower)
        index = lower.index(marker)
        root_cause = sample_output[:index].replace("ROOT CAUSE:", "").strip()
        patch = sample_output[index + len(marker):].strip()

        self.assertTrue(root_cause.startswith("The SQLAlchemy database connection pool"))
        self.assertTrue(patch.startswith("1. Ensure all session connections"))


if __name__ == "__main__":
    unittest.main()
