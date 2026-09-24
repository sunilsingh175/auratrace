"""
AutoTrace Python SDK
"""

from typing import Optional
from .client import AutoTrace, AuraTrace, TraceClient, Trace, AutomaticBackendDetection

_default_client: Optional[AutoTrace] = None

def init(
    api_key: Optional[str] = None,
    service_name: Optional[str] = None,
    endpoint: Optional[str] = None,
    environment: Optional[str] = None,
    version: Optional[str] = None,
    batch_size: int = 50,
    flush_interval_seconds: float = 1.0,
    install_global_hook: bool = True,
) -> AutoTrace:
    global _default_client
    _default_client = AutoTrace(
        api_key=api_key,
        service_name=service_name,
        endpoint=endpoint,
        environment=environment,
        version=version,
        batch_size=batch_size,
        flush_interval_seconds=flush_interval_seconds,
        install_global_hook=install_global_hook,
    )
    return _default_client

def capture_message(message: str, metadata: Optional[dict] = None) -> None:
    if _default_client is None:
        init()
    _default_client.capture_message(message, metadata=metadata)

def capture_exception(exception: BaseException, metadata: Optional[dict] = None) -> None:
    if _default_client is None:
        init()
    _default_client.capture_exception(exception, metadata=metadata)

def flush() -> None:
    if _default_client is not None:
        _default_client.flush()

__all__ = [
    "AutoTrace",
    "AuraTrace",
    "TraceClient",
    "Trace",
    "AutomaticBackendDetection",
    "init",
    "capture_message",
    "capture_exception",
    "flush",
]
