"""
AuraTrace Python Telemetry Client
Provides non-blocking async batching, structured logging, and unhandled exception capture.
"""

import sys
import time
import queue
import threading
import traceback
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import httpx


class AuraTrace:
    def __init__(
        self,
        service_id: str,
        api_key: str,
        endpoint: str = "http://localhost:8000",
        batch_size: int = 50,
        flush_interval_seconds: float = 1.0,
        install_global_hook: bool = True,
    ):
        self.service_id = service_id
        self.api_key = api_key
        self.endpoint = endpoint.rstrip("/")
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
        error_type: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Enqueues a telemetry log for non-blocking background dispatch."""
        item = {
            "service_id": self.service_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "latency_ms": float(latency_ms),
            "error_type": error_type,
            "message": message,
            "stack_trace": stack_trace,
            "metadata": metadata or {},
        }
        try:
            self._queue.put_nowait(item)
        except queue.Full:
            pass  # Drop under extreme backpressure to protect host app

    def info(self, message: str, latency_ms: float = 0.0, **metadata):
        self.log("INFO", message, latency_ms=latency_ms, metadata=metadata)

    def warn(self, message: str, latency_ms: float = 0.0, **metadata):
        self.log("WARN", message, latency_ms=latency_ms, metadata=metadata)

    def error(self, message: str, error_type: str = "ServerError", stack_trace: Optional[str] = None, **metadata):
        self.log("ERROR", message, error_type=error_type, stack_trace=stack_trace, metadata=metadata)

    def critical(self, message: str, error_type: str = "CriticalFailure", stack_trace: Optional[str] = None, **metadata):
        self.log("CRITICAL", message, error_type=error_type, stack_trace=stack_trace, metadata=metadata)

    def capture_exception(
        self,
        exc: BaseException,
        message: Optional[str] = None,
        latency_ms: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Extracts stack trace and error type from an Exception instance and dispatches it."""
        tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
        formatted_trace = "".join(tb_lines)
        error_type = exc.__class__.__name__
        msg = message or str(exc) or error_type

        self.log(
            level="ERROR",
            message=msg,
            latency_ms=latency_ms,
            error_type=error_type,
            stack_trace=formatted_trace,
            metadata=metadata,
        )

    def _install_excepthook(self):
        """Installs unhandled exception hook to automatically report fatal crashes."""
        original_hook = sys.excepthook

        def unhandled_handler(exc_type, exc_value, exc_traceback):
            try:
                formatted_trace = "".join(
                    traceback.format_exception(exc_type, exc_value, exc_traceback)
                )
                self.critical(
                    message=f"Unhandled crash: {exc_value}",
                    error_type=exc_type.__name__,
                    stack_trace=formatted_trace,
                )
                time.sleep(0.2)  # Allow flusher thread to flush before shutdown
            except Exception:
                pass
            original_hook(exc_type, exc_value, exc_traceback)

        sys.excepthook = unhandled_handler

    def _flusher_loop(self):
        """Background daemon sending buffered logs to AuraTrace Ingestion Gateway."""
        client = httpx.Client(timeout=5.0)
        url = f"{self.endpoint}/api/v1/telemetry/batch"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }

        while self._is_running:
            batch = []
            deadline = time.time() + self.flush_interval_seconds

            while len(batch) < self.batch_size and time.time() < deadline:
                try:
                    item = self._queue.get(timeout=0.1)
                    batch.append(item)
                except queue.Empty:
                    break

            if batch:
                try:
                    client.post(url, json={"events": batch}, headers=headers)
                except Exception:
                    pass  # Fail silent to avoid degrading primary service

    def shutdown(self):
        self._is_running = False
        if self._worker_thread.is_alive():
            self._worker_thread.join(timeout=1.0)
