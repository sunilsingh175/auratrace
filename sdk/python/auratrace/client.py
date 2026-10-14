"""
AuraTrace Python SDK Client
"""

import datetime
import traceback
from typing import Any, Dict, Optional

from .hooks import install_exception_hook
from .metadata import (
    get_runtime_info,
    resolve_api_key,
    resolve_endpoint,
    resolve_environment,
    resolve_service_name,
)
from .transport import HTTPTransport
from .engine import EmbeddedDiagnosticEngine, DiagnosticReport


class AuraTrace:
    """AuraTrace Telemetry & Crash Diagnostic Client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        service_name: Optional[str] = None,
        endpoint: Optional[str] = None,
        environment: Optional[str] = None,
        version: Optional[str] = "1.0.0",
        batch_size: int = 50,
        flush_interval_seconds: float = 1.0,
        install_global_hook: bool = True,
        enable_local_diagnosis: bool = True,
    ):
        self.api_key = resolve_api_key(api_key)
        self.service_name = resolve_service_name(service_name)
        self.endpoint = resolve_endpoint(endpoint)
        self.environment = resolve_environment(environment)
        self.version = version or "1.0.0"
        self.runtime_info = get_runtime_info()
        self.enable_local_diagnosis = enable_local_diagnosis

        self.engine = (
            EmbeddedDiagnosticEngine(service_name=self.service_name)
            if self.enable_local_diagnosis
            else None
        )

        self.transport = HTTPTransport(
            endpoint=self.endpoint,
            api_key=self.api_key,
            batch_size=batch_size,
            flush_interval_seconds=flush_interval_seconds,
        )

        if install_global_hook:
            install_exception_hook(self)

    def capture_message(
        self,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "info",
    ) -> None:
        """Capture and asynchronously send a log or informational event."""
        event = {
            "service_id": self.service_name,
            "service_name": self.service_name,
            "level": severity.upper(),
            "message": str(message),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metadata": {
                **(metadata or {}),
                "environment": self.environment,
                "version": self.version,
                **self.runtime_info,
            },
        }
        self.transport.enqueue(event)

    def capture_event(self, event_name: str, **fields: Any) -> None:
        """Capture a custom telemetry event."""
        metadata = fields.pop("metadata", {})
        event = {
            "service_id": self.service_name,
            "service_name": self.service_name,
            "level": "INFO",
            "message": str(event_name),
            "event_name": str(event_name),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metadata": {
                **(metadata if isinstance(metadata, dict) else {}),
                **fields,
                "environment": self.environment,
                "version": self.version,
                **self.runtime_info,
            },
        }
        self.transport.enqueue(event)

    def capture_exception(
        self,
        exception: BaseException,
        metadata: Optional[Dict[str, Any]] = None,
        severity: str = "critical",
        extra_context: Optional[Dict[str, Any]] = None,
    ) -> Optional[DiagnosticReport]:
        """Capture an exception, stack trace, and context, enqueueing for ingestion."""
        tb_lines = traceback.format_exception(
            type(exception), exception, exception.__traceback__
        )
        stack_trace = "".join(tb_lines)

        event = {
            "service_id": self.service_name,
            "service_name": self.service_name,
            "level": "ERROR" if severity != "critical" else "CRITICAL",
            "message": f"{type(exception).__name__}: {str(exception)}",
            "error_type": type(exception).__name__,
            "error_message": str(exception),
            "stack_trace": stack_trace,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metadata": {
                **(metadata or {}),
                **(extra_context or {}),
                "exception_type": type(exception).__name__,
                "environment": self.environment,
                "version": self.version,
                **self.runtime_info,
            },
        }

        # Embedded Autonomous Diagnostics (Zero Backend Mode)
        report: Optional[DiagnosticReport] = None
        if self.engine is not None:
            try:
                report = self.engine.evaluate_crash(
                    exception=exception,
                    stack_trace=stack_trace,
                    context_metadata=metadata,
                )
                event["metadata"]["diagnostic_report"] = report.to_dict()
            except Exception:
                pass

        self.transport.enqueue(event)
        return report

    def diagnose(
        self,
        exception: BaseException,
        auto_sandbox: bool = False,
    ) -> Optional[DiagnosticReport]:
        """Manually trigger local AI doctor diagnosis and Safety Gate inspection."""
        if self.engine is None:
            self.engine = EmbeddedDiagnosticEngine(service_name=self.service_name)
        return self.engine.evaluate_crash(exception, auto_sandbox=auto_sandbox)

    def flush(self, timeout: float = 2.0) -> None:
        """Flush all pending telemetry events synchronously."""
        self.transport.flush(timeout=timeout)

    def close(self) -> None:
        """Shut down transport worker thread."""
        self.transport.shutdown()


# Backward compatibility aliases
AuraTraceClient = AuraTrace
AutoTrace = AuraTrace
TraceClient = AuraTrace
Trace = AuraTrace
AutomaticBackendDetection = AuraTrace
