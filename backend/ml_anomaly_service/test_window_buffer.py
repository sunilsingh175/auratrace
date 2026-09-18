import unittest
from unittest.mock import patch

import numpy as np

from backend.ml_anomaly_service.window_buffer import (
    FEATURE_NAMES,
    LogBuffer,
    ServiceLogBufferManager,
)


class TestLogBuffer(unittest.TestCase):
    def test_empty_buffer_returns_zero_vector(self):
        buffer = LogBuffer()
        features = buffer.extract_features()

        self.assertEqual(features.shape, (1, len(FEATURE_NAMES)))
        np.testing.assert_array_equal(features, np.zeros((1, 8), dtype=np.float32))

    def test_feature_aggregation(self):
        buffer = LogBuffer(window_seconds=300)

        buffer.add_log({
            "service_id": "payments",
            "level": "ERROR",
            "status_code": 500,
            "latency_ms": 100,
            "error_type": "TimeoutError",
        })
        buffer.add_log({
            "service_id": "payments",
            "level": "INFO",
            "status_code": 200,
            "latency_ms": 300,
        })

        features = buffer.get_feature_dict()

        self.assertEqual(features["error_count"], 1.0)
        self.assertEqual(features["request_count"], 2.0)
        self.assertEqual(features["error_rate"], 0.5)
        self.assertEqual(features["avg_latency_ms"], 200.0)
        self.assertEqual(features["max_latency_ms"], 300.0)
        self.assertEqual(features["unique_error_types"], 1.0)

    def test_expired_events_are_removed(self):
        buffer = LogBuffer(window_seconds=300)

        with patch("backend.ml_anomaly_service.window_buffer.time.time", side_effect=[1000.0, 1301.0]):
            buffer.add_log({
                "service_id": "payments",
                "level": "ERROR",
                "status_code": 500,
                "latency_ms": 100,
                "error_type": "TimeoutError",
            })
            self.assertEqual(len(buffer.get_logs()), 0)

    def test_service_buffers_are_isolated(self):
        manager = ServiceLogBufferManager(window_seconds=300)

        manager.add_log({
            "service_id": "payments",
            "level": "ERROR",
            "status_code": 500,
            "latency_ms": 1000,
            "error_type": "TimeoutError",
        })
        manager.add_log({
            "service_id": "auth",
            "level": "INFO",
            "status_code": 200,
            "latency_ms": 50,
        })

        self.assertEqual(manager.get_buffer_size("payments"), 1)
        self.assertEqual(manager.get_buffer_size("auth"), 1)
        self.assertEqual(manager.get_buffer_size("orders"), 0)
        self.assertEqual(manager.get_feature_dict("payments")["error_count"], 1.0)
        self.assertEqual(manager.get_feature_dict("auth")["error_count"], 0.0)


if __name__ == "__main__":
    unittest.main()
