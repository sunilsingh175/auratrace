"""
Tests for AuraTrace Python Unhandled Exception Hooks
"""

import sys
import unittest
from unittest.mock import MagicMock

from auratrace.hooks import install_exception_hook, uninstall_exception_hook


class TestAuraTraceHooks(unittest.TestCase):
    def setUp(self):
        uninstall_exception_hook()
        self.original_hook = sys.excepthook
        self.mock_client = MagicMock()

    def tearDown(self):
        uninstall_exception_hook()
        sys.excepthook = self.original_hook

    def test_hook_captures_unhandled_exception(self):
        install_exception_hook(self.mock_client)
        self.assertNotEqual(sys.excepthook, self.original_hook)

        test_exc = RuntimeError("Fatal worker failure")
        sys.excepthook(RuntimeError, test_exc, None)

        self.mock_client.capture_exception.assert_called_once()
        args, kwargs = self.mock_client.capture_exception.call_args
        self.assertEqual(args[0], test_exc)
        self.assertEqual(kwargs.get("severity"), "critical")
        self.mock_client.flush.assert_called_once()

    def test_uninstall_hook_restores_original(self):
        install_exception_hook(self.mock_client)
        uninstall_exception_hook()
        self.assertEqual(sys.excepthook, self.original_hook)


if __name__ == "__main__":
    unittest.main()
