"""
Tests for AuraTrace Python HTTP Transport
"""

import unittest
from unittest.mock import MagicMock, patch

from auratrace.transport import HTTPTransport


class TestAuraTraceTransport(unittest.TestCase):
    def setUp(self):
        self.transport = HTTPTransport(
            endpoint="http://localhost:8000",
            api_key="test_key_abc",
            batch_size=2,
            flush_interval_seconds=0.2,
        )

    def tearDown(self):
        self.transport.shutdown(flush_events=False)

    def test_enqueue_and_flush(self):
        with patch.object(self.transport, "send_batch", return_value=True) as mock_send:
            self.transport.enqueue({"message": "event-1"})
            self.transport.enqueue({"message": "event-2"})
            self.transport.flush()

            mock_send.assert_called()
            batch = mock_send.call_args[0][0]
            self.assertEqual(len(batch), 2)
            self.assertEqual(batch[0]["message"], "event-1")
            self.assertEqual(batch[1]["message"], "event-2")

    def test_fail_silent_on_network_error(self):
        # send_batch should return False and never raise uncaught exception
        with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
            success = self.transport.send_batch([{"message": "event"}])
            self.assertFalse(success)


if __name__ == "__main__":
    unittest.main()
