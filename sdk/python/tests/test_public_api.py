import unittest
from unittest.mock import patch

import auratrace
from auratrace.client import AuraTrace


class TestPublicAPI(unittest.TestCase):
    def test_client_compatibility_alias(self):
        self.assertIs(auratrace.AuraTraceClient, AuraTrace)

    def test_capture_event_enqueues_event(self):
        client = AuraTrace(
            service_name="test-service",
            install_global_hook=False,
            enable_local_diagnosis=False,
        )
        try:
            with patch.object(client.transport, "enqueue") as enqueue:
                client.capture_event(
                    "payment_processed",
                    payment_id="pay-123",
                )

                event = enqueue.call_args.args[0]
                self.assertEqual(event["event_name"], "payment_processed")
                self.assertEqual(event["metadata"]["payment_id"], "pay-123")
                self.assertEqual(event["service_name"], "test-service")
        finally:
            client.close()

    def test_import_does_not_create_default_client(self):
        self.assertIsNone(auratrace._default_client)

    def test_top_level_capture_event_uses_initialized_client(self):
        client = auratrace.init(
            service_name="test-service",
            install_global_hook=False,
            enable_local_diagnosis=False,
        )
        try:
            with patch.object(client.transport, "enqueue") as enqueue:
                auratrace.capture_event("health_check", healthy=True)

                event = enqueue.call_args.args[0]
                self.assertEqual(event["event_name"], "health_check")
                self.assertTrue(event["metadata"]["healthy"])
        finally:
            client.close()
            auratrace._default_client = None


if __name__ == "__main__":
    unittest.main()
