"""AuraTrace Python SDK — automatic crash capture and diagnostics."""

from typing import Any, Dict, Optional

from .client import (
    AuraTrace,
    AuraTraceClient,
    AutomaticBackendDetection,
    AutoTrace,
    Trace,
    TraceClient,
)
from .hooks import install_exception_hook, uninstall_exception_hook
from .metadata import (
    get_runtime_info,
    resolve_api_key,
    resolve_endpoint,
    resolve_environment,
    resolve_service_name,
)
from .transport import HTTPTransport
from .engine import EmbeddedDiagnosticEngine, DiagnosticReport
from .safety import inspect_patch, PatchSafetyResult
from .sandbox import run_sandbox_test

_default_client: Optional[AuraTrace] = None


def init(
    api_key: Optional[str] = None,
    service_name: Optional[str] = None,
    endpoint: Optional[str] = None,
    environment: Optional[str] = None,
    version: Optional[str] = "1.0.0",
    batch_size: int = 50,
    flush_interval_seconds: float = 1.0,
    install_global_hook: bool = True,
    enable_local_diagnosis: bool = True,
) -> AuraTrace:
    """Configure the default AuraTrace client."""
    global _default_client

    if _default_client is not None:
        _default_client.close()

    _default_client = AuraTrace(
        api_key=api_key,
        service_name=service_name,
        endpoint=endpoint,
        environment=environment,
        version=version,
        batch_size=batch_size,
        flush_interval_seconds=flush_interval_seconds,
        install_global_hook=install_global_hook,
        enable_local_diagnosis=enable_local_diagnosis,
    )
    return _default_client


def _get_or_create_client() -> AuraTrace:
    global _default_client
    if _default_client is None:
        _default_client = AuraTrace()
    return _default_client


def capture_message(
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    severity: str = "info",
) -> None:
    """Capture a log message."""
    _get_or_create_client().capture_message(
        message, metadata=metadata, severity=severity
    )


def capture_event(event_name: str, **fields: Any) -> None:
    """Capture a custom telemetry event."""
    _get_or_create_client().capture_event(event_name, **fields)


def capture_exception(
    exception: BaseException,
    metadata: Optional[Dict[str, Any]] = None,
    extra_context: Optional[Dict[str, Any]] = None,
    severity: str = "critical",
) -> Optional[DiagnosticReport]:
    """Capture and diagnose an exception."""
    return _get_or_create_client().capture_exception(
        exception,
        metadata=metadata,
        extra_context=extra_context,
        severity=severity,
    )


def diagnose(
    exception: BaseException, auto_sandbox: bool = False
) -> Optional[DiagnosticReport]:
    """Run embedded crash diagnosis."""
    return _get_or_create_client().diagnose(
        exception, auto_sandbox=auto_sandbox
    )


def flush() -> None:
    """Flush pending telemetry batches."""
    if _default_client is not None:
        _default_client.flush()


__all__ = [
    "AuraTrace",
    "AuraTraceClient",
    "AutoTrace",
    "TraceClient",
    "Trace",
    "AutomaticBackendDetection",
    "init",
    "capture_message",
    "capture_event",
    "capture_exception",
    "diagnose",
    "flush",
    "HTTPTransport",
    "EmbeddedDiagnosticEngine",
    "DiagnosticReport",
    "inspect_patch",
    "PatchSafetyResult",
    "run_sandbox_test",
    "install_exception_hook",
    "uninstall_exception_hook",
    "get_runtime_info",
    "resolve_api_key",
    "resolve_endpoint",
    "resolve_environment",
    "resolve_service_name",
]
