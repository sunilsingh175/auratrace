"""
AuraTrace Python SDK Automatic Exception Hooks
"""

import sys
import traceback
from typing import Any, Callable, Optional

_original_excepthook: Optional[Callable] = None
_installed = False


def install_exception_hook(client: Any) -> None:
    """
    Install global sys.excepthook to automatically intercept unhandled
    application crashes, capture them, flush telemetry, and forward to original handler.
    """
    global _original_excepthook, _installed
    if _installed:
        return

    _original_excepthook = sys.excepthook

    def unhandled_crash_handler(exc_type, exc_value, exc_traceback):
        if exc_type is not KeyboardInterrupt:
            try:
                client.capture_exception(
                    exc_value,
                    metadata={
                        "unhandled": True,
                        "hook": "sys.excepthook",
                        "exception_type": getattr(exc_type, "__name__", str(exc_type)),
                    },
                    severity="critical",
                )
                client.flush(timeout=2.0)
            except Exception:
                pass  # Never crash the crash handler

        if _original_excepthook is not None:
            _original_excepthook(exc_type, exc_value, exc_traceback)

    sys.excepthook = unhandled_crash_handler
    _installed = True


def uninstall_exception_hook() -> None:
    """Restore original sys.excepthook handler."""
    global _original_excepthook, _installed
    if _installed and _original_excepthook is not None:
        sys.excepthook = _original_excepthook
        _original_excepthook = None
        _installed = False
