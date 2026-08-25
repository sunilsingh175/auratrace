"""
AuraTrace Python Telemetry & Crash Reporting SDK
"""

from .client import AuraTrace
from .interceptor import AuraTraceMiddleware

__all__ = ["AuraTrace", "AuraTraceMiddleware"]
__version__ = "1.0.0"
