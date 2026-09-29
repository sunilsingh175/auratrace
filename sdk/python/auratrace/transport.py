"""
AuraTrace Python SDK HTTP Transport & Daemon Dispatcher
"""

import json
import logging
import queue
import threading
import time
import urllib.request
from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # Fallback to standard library urllib

logger = logging.getLogger("auratrace.transport")


class HTTPTransport:
    """Thread-safe background queue with daemon batch flushing and fail-silent resilience."""

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        batch_size: int = 50,
        flush_interval_seconds: float = 1.0,
    ):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.batch_size = max(1, batch_size)
        self.flush_interval_seconds = max(0.1, flush_interval_seconds)

        self._queue: queue.Queue[Dict[str, Any]] = queue.Queue(maxsize=10000)
        self._is_running = True
        self._lock = threading.Lock()

        # Start daemon sender thread
        self._worker_thread = threading.Thread(
            target=self._flusher_loop,
            daemon=True,
            name="AuraTrace-Transport-Worker",
        )
        self._worker_thread.start()

    def enqueue(self, event: Dict[str, Any]) -> bool:
        """Enqueue telemetry event for asynchronous delivery."""
        if not self._is_running:
            return False
        try:
            self._queue.put_nowait(event)
            return True
        except queue.Full:
            logger.debug("AuraTrace telemetry queue full, dropping oldest event")
            try:
                self._queue.get_nowait()
                self._queue.put_nowait(event)
                return True
            except Exception:
                return False

    def send_batch(self, batch: List[Dict[str, Any]]) -> bool:
        """Send a batch of telemetry events via HTTP POST to the ingestion gateway."""
        if not batch or not self.api_key:
            return False

        url = f"{self.endpoint}/api/v1/telemetry/batch"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "X-Project-Key": self.api_key,
        }

        try:
            if httpx is not None:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.post(url, json={"events": batch}, headers=headers)
                    return resp.is_success
            else:
                req_data = json.dumps({"events": batch}).encode("utf-8")
                req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    return 200 <= resp.status < 300
        except Exception as exc:
            logger.debug(f"AuraTrace telemetry batch delivery failed silently: {exc}")
            return False

    def flush(self, timeout: float = 2.0) -> None:
        """Flushes all queued events synchronously."""
        batch: List[Dict[str, Any]] = []
        while not self._queue.empty():
            try:
                item = self._queue.get_nowait()
                batch.append(item)
            except queue.Empty:
                break

        if batch:
            self.send_batch(batch)

    def _flusher_loop(self) -> None:
        """Background daemon sending buffered logs to AuraTrace Ingestion Gateway."""
        while self._is_running:
            batch: List[Dict[str, Any]] = []
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
                self.send_batch(batch)

    def shutdown(self, flush_events: bool = True) -> None:
        """Gracefully stop background thread."""
        if flush_events:
            self.flush()
        self._is_running = False
        if self._worker_thread.is_alive() and threading.current_thread() != self._worker_thread:
            self._worker_thread.join(timeout=1.0)
