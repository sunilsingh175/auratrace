"""
AuraTrace Python SDK
Zero-configuration telemetry, automatic service discovery, and AI root cause capture.
"""

import os
import sys
import time
import queue
import threading
import traceback
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import urllib.request
import urllib.error

try:
    import httpx
except ImportError:
    httpx = None


def auto_detect_service_name() -> str:
    """Auto-detects the service identifier from environment variables or running script."""
    name = (
        os.getenv("AUTOTRACE_SERVICE_NAME")
        or os.getenv("AURATRACE_SERVICE_NAME")
        or os.getenv("SERVICE_NAME")
        or os.getenv("APP_NAME")
    )
    if name:
        return name.strip()

    if sys.argv and sys.argv[0]:
        base = os.path.basename(sys.argv[0])
        clean = os.path.splitext(base)[0]
        if clean and clean not in ("python", "python3", "pytest", "uvicorn", "gunicorn", "__main__", "-c"):
            return clean

def _sanitize_stack_trace(trace_str: str) -> str:
    if not trace_str:
        return ""
    import re
    def _clean_path(match):
        full_path = match.group(1).replace("\\", "/")
        parts = full_path.split("/")
        for marker in ["scripts", "app", "backend", "services", "controllers", "models", "workers"]:
            if marker in parts:
                idx = parts.index(marker)
                return f'File "{"/".join(parts[idx:])}"'
        if len(parts) > 1:
            return f'File "{"/".join(parts[-2:])}"'
        return f'File "{parts[-1]}"'
    return re.sub(r'File "([^"]+)"', _clean_path, trace_str)


class AuraTrace:
    def __init__(
        self,
        api_key: Optional[str] = None,
        service_name: Optional[str] = None,
        endpoint: Optional[str] = None,
        environment: Optional[str] = None,
        version: Optional[str] = None,
        batch_size: int = 50,
        flush_interval_seconds: float = 1.0,
        install_global_hook: bool = True,
    ):
        self.api_key = (
            api_key
            or os.getenv("AURATRACE_API_KEY")
            or os.getenv("AUTOTRACE_API_KEY")
            or os.getenv("AURA_MASTER_API_KEY")
            or ""
        )
        self.service_name = service_name or auto_detect_service_name()
        self.endpoint = (
            endpoint
            or os.getenv("AURATRACE_ENDPOINT")
            or os.getenv("AUTOTRACE_ENDPOINT")
            or "http://localhost:8000"
        ).rstrip("/")
        self.environment = environment or os.getenv("ENV") or os.getenv("ENVIRONMENT") or "production"
        self.version = version or os.getenv("APP_VERSION") or "1.0.0"
        self.runtime = "python"
        self.batch_size = batch_size
        self.flush_interval_seconds = flush_interval_seconds

        self._queue: queue.Queue = queue.Queue(maxsize=10000)
        self._is_running = True
        self._worker_thread = threading.Thread(target=self._flusher_loop, daemon=True)
        self._worker_thread.start()

        if install_global_hook:
            self._install_excepthook()

    def log(
        self,
        level: str,
        message: str,
        latency_ms: float = 0.0,
        status_code: int = 200,
        error_type: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Enqueues a telemetry log for non-blocking background dispatch."""
        item = {
            "service_id": self.service_name,
            "runtime": self.runtime,
            "environment": self.environment,
            "version": self.version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "latency_ms": float(latency_ms),
            "status_code": int(status_code),
            "error_type": error_type,
            "message": message,
            "stack_trace": stack_trace,
            "raw_stack_trace": stack_trace,
            "metadata": metadata or {},
        }
        try:
            self._queue.put_nowait(item)
        except queue.Full:
            pass  # Drop under extreme backpressure to protect host app

    def capture_message(
        self,
        message: str,
        level: str = "INFO",
        latency_ms: float = 0.0,
        status_code: int = 200,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Dispatches a custom log message with metadata tags."""
        self.log(
            level=level,
            message=message,
            latency_ms=latency_ms,
            status_code=status_code,
            metadata=metadata,
        )

    def info(self, message: str, latency_ms: float = 0.0, **metadata):
        self.log("INFO", message, latency_ms=latency_ms, metadata=metadata)

    def warn(self, message: str, latency_ms: float = 0.0, **metadata):
        self.log("WARN", message, latency_ms=latency_ms, metadata=metadata)

    def error(self, message: str, error_type: str = "ServerError", stack_trace: Optional[str] = None, **metadata):
        self.log("ERROR", message, error_type=error_type, stack_trace=stack_trace, status_code=500, metadata=metadata)

    def critical(self, message: str, error_type: str = "CriticalFailure", stack_trace: Optional[str] = None, **metadata):
        self.log("CRITICAL", message, error_type=error_type, stack_trace=stack_trace, status_code=500, metadata=metadata)


    def capture_exception(
        self,
        exc: BaseException,
        message: Optional[str] = None,
        latency_ms: float = 0.0,
        status_code: int = 500,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Extracts stack trace and error type from an Exception instance and dispatches it."""
        tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
        formatted_trace = _sanitize_stack_trace("".join(tb_lines))
        error_type = exc.__class__.__name__
        msg = message or str(exc) or error_type

        self.log(
            level="ERROR",
            message=msg,
            latency_ms=latency_ms,
            status_code=status_code,
            error_type=error_type,
            stack_trace=formatted_trace,
            metadata=metadata,
        )

    def _install_excepthook(self):
        """Installs unhandled exception hook to automatically report fatal crashes."""
        original_hook = sys.excepthook

        def unhandled_handler(exc_type, exc_value, exc_traceback):
            try:
                formatted_trace = _sanitize_stack_trace(
                    "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
                )
                self.critical(
                    message=f"Unhandled crash: {exc_value}",
                    error_type=exc_type.__name__,
                    stack_trace=formatted_trace,
                )
                time.sleep(0.3)  # Allow flusher thread to flush before shutdown
            except Exception:
                pass
            original_hook(exc_type, exc_value, exc_traceback)

        sys.excepthook = unhandled_handler

    def _send_batch(self, batch: List[Dict[str, Any]]):
        if not batch:
            return
        url = f"{self.endpoint}/api/v1/telemetry/batch"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "X-Project-Key": self.api_key,
        }
        try:
            if httpx is not None:
                with httpx.Client(timeout=5.0) as client:
                    client.post(url, json={"events": batch}, headers=headers)
            else:
                req_data = json.dumps({"events": batch}).encode("utf-8")
                req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    pass
        except Exception:
            pass  # Fail silent to avoid degrading host application

    def flush(self, timeout: float = 2.0):
        """Flushes all queued items synchronously."""
        batch = []
        while not self._queue.empty():
            try:
                item = self._queue.get_nowait()
                batch.append(item)
            except queue.Empty:
                break
        if batch:
            self._send_batch(batch)

    def _flusher_loop(self):
        """Background daemon sending buffered logs to AuraTrace Ingestion Gateway."""
        while self._is_running:
            batch = []
            try:
                item = self._queue.get(timeout=self.flush_interval_seconds)
                batch.append(item)
                while len(batch) < self.batch_size:
                    try:
                        batch.append(self._queue.get_nowait())
                    except queue.Empty:
                        break
            except queue.Empty:
                pass

            if batch:
                self._send_batch(batch)

    def shutdown(self):
        self._is_running = False
        if self._worker_thread.is_alive():
            self._worker_thread.join(timeout=1.0)


# Backward compatibility & ergonomic aliases
AutoTrace = AuraTrace
TraceClient = AuraTrace
Trace = AuraTrace
AutomaticBackendDetection = AuraTrace
