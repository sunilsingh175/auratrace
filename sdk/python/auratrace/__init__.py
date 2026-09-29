"""
AuraTrace Python SDK.

Importing this module automatically starts the crash-capture client. Application
code does not need to call init(), capture_exception(), or add an exception hook.
Explicit init() remains available when an application needs to override defaults.
"""

from typing import Optional
from .client import AuraTrace, AutoTrace, TraceClient, Trace, AutomaticBackendDetection

_default_client: Optional[AuraTrace] = None


def init(
    api_key: Optional[str] = None,
    service_name: Optional[str] = None,
    endpoint: Optional[str] = None,
    environment: Optional[str] = None,
    version: Optional[str] = None,
    batch_size: int = 50,
    flush_interval_seconds: float = 1.0,
    install_global_hook: bool = True,
) -> AuraTrace:
    global _default_client
    _default_client = AuraTrace(
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


def _auto_start() -> AuraTrace:
    """Start the default client on package import for zero-code crash capture."""
    global _default_client
    if _default_client is None:
        _default_client = AuraTrace()
    return _default_client


def capture_message(message: str, metadata: Optional[dict] = None) -> None:
    if _default_client is None:
        _auto_start()
    _default_client.capture_message(message, metadata=metadata)


def capture_exception(exception: BaseException, metadata: Optional[dict] = None) -> None:
    if _default_client is None:
        _auto_start()
    _default_client.capture_exception(exception, metadata=metadata)


def flush() -> None:
    if _default_client is not None:
        _default_client.flush()


# Zero-code mode: importing the package is enough to install the global crash hook.
# The SDK remains fail-silent when the AuraTrace endpoint or credentials are absent.
_auto_start()


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
