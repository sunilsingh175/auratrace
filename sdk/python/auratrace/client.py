"""
Main AuraTrace Python client.

- Background thread for batched HTTP sends
- Never blocks the host application
- Never raises exceptions to the caller
"""
import atexit
import json
import os
import queue
import threading
import time
import urllib.error
import urllib.request
import sys
from datetime import datetime

from .handlers import install_handlers, format_exception
from .runtime import detect_runtime, detect_service_name, detect_environment
from .sanitizer import sanitize

# ── Module-level singleton ───────────────────────────────
_client: "AuraTraceClient | None" = None


class AuraTraceClient:
    def __init__(
        self,
        api_key: str,
        endpoint: str = "http://localhost:8000",
        service_name: str | None = None,
        environment: str | None = None,
        auto_capture: bool = True,
        batch_size: int = 20,
        flush_interval: float = 3.0,
        timeout: float = 5.0,
    ):
        # Skip entirely if disabled via env
        if os.getenv("AURATRACE_DISABLED") == "1":
            self.enabled = False
            return

        self.enabled = True
        self.api_key = api_key
        self.endpoint = endpoint.rstrip("/")
        self.service_name = service_name or detect_service_name()
        self.environment = environment or detect_environment()
        self.runtime = detect_runtime()
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.timeout = timeout

        # Bounded queue — never blocks producer
        self._queue: queue.Queue = queue.Queue(maxsize=10_000)
        self._running = True

        # Background flush thread
        self._thread = threading.Thread(
            target=self._worker_loop,
            name="auratrace-flush",
            daemon=True,
        )
        self._thread.start()

        if auto_capture:
            install_handlers(self.capture_exception)

        atexit.register(self.flush)

    # ── Public API ───────────────────────────────────────

    def capture_exception(self, exc: BaseException, **extra):
        """Capture an exception and queue it for sending."""
        if not self.enabled:
            return
        if isinstance(exc, KeyboardInterrupt):
            return

        payload = {
            "event_type": "crash",
            "timestamp": datetime.utcnow().isoformat(),
            "service_name": self.service_name,
            "environment": self.environment,
            "error_type": type(exc).__name__,
            "error_message": str(exc)[:1000],
            "stack_trace": format_exception(exc),
            "runtime": self.runtime,
            "sdk_name": "auratrace-sdk",
            "sdk_version": "1.0.0",
            **extra,
        }
        self._enqueue(payload)

    def capture_event(self, event_type: str, **data):
        """Capture a custom event (latency, metrics, etc.)."""
        if not self.enabled:
            return
        payload = {
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "service_name": self.service_name,
            "environment": self.environment,
            "runtime": self.runtime,
            "sdk_name": "auratrace-sdk",
            "sdk_version": "1.0.0",
            **data,
        }
        self._enqueue(payload)

    # ── Internals ────────────────────────────────────────

    def _enqueue(self, payload: dict):
        try:
            sanitized = sanitize(payload)
            self._queue.put_nowait(sanitized)
        except queue.Full:
            pass  # Drop silently — never block
        except Exception:
            pass

    def _worker_loop(self):
        while self._running:
            try:
                batch = self._drain_batch()
                if batch:
                    self._send(batch)
                else:
                    time.sleep(self.flush_interval)
            except Exception:
                time.sleep(1)  # back off

    def _drain_batch(self) -> list[dict]:
        batch: list[dict] = []
        deadline = time.time() + 0.5
        while len(batch) < self.batch_size and time.time() < deadline:
            try:
                batch.append(self._queue.get(timeout=0.1))
            except queue.Empty:
                if batch:
                    break
        return batch

    def _send(self, batch: list[dict]):
        """Send a batch (or single) event to AuraTrace."""
        if len(batch) == 1:
            url = f"{self.endpoint}/v1/ingest"
            body = json.dumps(batch[0]).encode()
        else:
            url = f"{self.endpoint}/v1/ingest/batch"
            body = json.dumps(batch).encode()

        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("X-API-Key", self.api_key)

        try:
            urllib.request.urlopen(req, timeout=self.timeout).read()
        except (urllib.error.URLError, urllib.error.HTTPError, OSError):
            pass  # Never raise

    def flush(self):
        """Force-send all queued events (called on exit)."""
        if not self.enabled:
            return
        try:
            remaining: list[dict] = []
            while not self._queue.empty():
                try:
                    remaining.append(self._queue.get_nowait())
                except queue.Empty:
                    break
            if remaining:
                self._send(remaining)
        except Exception:
            pass


# ── Module-level convenience functions ───────────────────

def init(
    api_key: str | None = None,
    endpoint: str | None = None,
    **kwargs,
) -> AuraTraceClient:
    """
    Initialize the SDK.
    api_key falls back to AURATRACE_API_KEY env var.
    endpoint falls back to AURATRACE_ENDPOINT env var.
    """
    global _client

    api_key = api_key or os.getenv("AURATRACE_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing API key. Pass api_key=... or set AURATRACE_API_KEY env var."
        )

    endpoint = endpoint or os.getenv("AURATRACE_ENDPOINT", "http://localhost:8000")

    _client = AuraTraceClient(api_key=api_key, endpoint=endpoint, **kwargs)
    return _client


def get_client() -> AuraTraceClient | None:
    return _client


def capture_exception(exc: BaseException, **extra):
    if _client:
        _client.capture_exception(exc, **extra)


def capture_event(event_type: str, **data):
    if _client:
        _client.capture_event(event_type, **data)
