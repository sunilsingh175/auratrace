"""
AuraTrace Python SDK — zero-config crash capture.

Usage:
    from auratrace import init
    init(api_key="aura_live_...")
"""
from .client import AuraTraceClient, get_client, init
from .client import capture_exception, capture_event

__version__ = "1.0.0"
__all__ = [
    "init",
    "capture_exception",
    "capture_event",
    "AuraTraceClient",
    "get_client",
]
