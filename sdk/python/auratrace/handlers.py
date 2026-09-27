"""
Global exception handlers — installs sys.excepthook + threading.excepthook.
"""
import sys
import threading
import traceback
from typing import Callable


def install_handlers(capture_fn: Callable):
    """Install global exception handlers that call capture_fn(exc)."""

    # Main thread
    original_excepthook = sys.excepthook

    def excepthook(exc_type, exc_value, tb):
        try:
            if exc_type is KeyboardInterrupt:
                return original_excepthook(exc_type, exc_value, tb)
            capture_fn(exc_value)
        except Exception:
            pass  # NEVER break the app
        finally:
            original_excepthook(exc_type, exc_value, tb)

    sys.excepthook = excepthook

    # Background threads
    if hasattr(threading, "excepthook"):
        original_thread_hook = threading.excepthook

        def thread_hook(args):
            try:
                if args.exc_type is SystemExit:
                    return original_thread_hook(args)
                capture_fn(args.exc_value)
            except Exception:
                pass
            finally:
                original_thread_hook(args)

        threading.excepthook = thread_hook


def format_exception(exc: BaseException) -> str:
    """Format the full traceback as a string."""
    return "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[:20000]
