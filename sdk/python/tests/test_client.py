"""
Tests for AuraTrace Python Client
"""

import os
import unittest
from unittest.mock import MagicMock, patch

from auratrace.client import AuraTrace


class TestAuraTraceClient(unittest.TestCase):
    def setUp(self):
        self.client = AuraTrace(
            api_key="test_api_key_123",
            service_name="test-order-service",
            endpoint="http://localhost:8000",
            environment="test",
            install_global_hook=False,
        )

    def tearDown(self):
        self.client.close()

    def test_client_initialization(self):
        self.assertEqual(self.client.api_key, "test_api_key_123")
        self.assertEqual(self.client.service_name, "test-order-service")
        self.assertEqual(self.client.environment, "test")
        self.assertEqual(self.client.endpoint, "http://localhost:8000")
        self.assertIn("language", self.client.runtime_info)
        self.assertEqual(self.client.runtime_info["language"], "python")

    def test_capture_message(self):
        with patch.object(self.client.transport, "enqueue") as mock_enqueue:
            self.client.capture_message("Order processed successfully", metadata={"order_id": 42})
            mock_enqueue.assert_called_once()
            event = mock_enqueue.call_args[0][0]
            self.assertEqual(event["service_name"], "test-order-service")
            self.assertEqual(event["level"], "INFO")
            self.assertEqual(event["message"], "Order processed successfully")
            self.assertEqual(event["metadata"]["order_id"], 42)

    def test_capture_exception(self):
        with patch.object(self.client.transport, "enqueue") as mock_enqueue:
            try:
                raise ValueError("Invalid payment payload amount")
            except ValueError as exc:
                self.client.capture_exception(exc, metadata={"user_id": "u-101"})

            mock_enqueue.assert_called_once()
            event = mock_enqueue.call_args[0][0]
            self.assertEqual(event["service_name"], "test-order-service")
            self.assertEqual(event["error_type"], "ValueError")
            self.assertEqual(event["error_message"], "Invalid payment payload amount")
            self.assertIn("Traceback", event["stack_trace"])
            self.assertEqual(event["metadata"]["user_id"], "u-101")


if __name__ == "__main__":
    unittest.main()
