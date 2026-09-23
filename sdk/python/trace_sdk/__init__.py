"""
Trace Python Telemetry & Crash Reporting SDK
"""

from .client import Trace
from .interceptor import TraceMiddleware

__all__ = ["Trace", "TraceMiddleware"]
__version__ = "1.0.0"
