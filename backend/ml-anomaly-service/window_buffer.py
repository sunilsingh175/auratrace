"""
AuraTrace Sliding Window Buffer
Aggregates telemetry stream logs over time windows and computes statistical feature vectors.
"""

import time
import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class WindowStats:
    service_id: str
    sample_count: int
    latency_mean: float
    latency_p95: float
    latency_std: float
    error_ratio: float
    error_count: int
    feature_vector: np.ndarray
    latest_error_type: Optional[str] = None
    latest_stack_trace: Optional[str] = None
    latest_message: Optional[str] = None


class RollingWindowBuffer:
    def __init__(self, window_size_seconds: int = 300):
        self.window_size_seconds = window_size_seconds
        # Buffer keyed by service_id -> list of log dicts
        self._buffer: Dict[str, List[Dict[str, Any]]] = {}

    def add_log(self, log_event: Dict[str, Any]):
        """Inserts a new log event into the buffer."""
        service_id = log_event.get("service_id", "default-service")
        if service_id not in self._buffer:
            self._buffer[service_id] = []

        event_copy = dict(log_event)
        event_copy["_received_ts"] = time.time()
        self._buffer[service_id].append(event_copy)

    def evict_stale(self, service_id: str):
        """Removes logs older than the rolling window threshold."""
        if service_id not in self._buffer:
            return

        cutoff = time.time() - self.window_size_seconds
        self._buffer[service_id] = [
            item for item in self._buffer[service_id]
            if item.get("_received_ts", 0) >= cutoff
        ]

    def get_stats(self, service_id: str) -> Optional[WindowStats]:
        """
        Computes and returns the statistical feature representation for a service's window.
        """
        self.evict_stale(service_id)
        events = self._buffer.get(service_id, [])

        if not events:
            return None

        latencies = []
        error_count = 0
        latest_error_type = None
        latest_stack_trace = None
        latest_message = None

        for ev in events:
            try:
                lat = float(ev.get("latency_ms", 0.0))
                latencies.append(lat)
            except (ValueError, TypeError):
                latencies.append(0.0)

            lvl = str(ev.get("level", "")).upper()
            if lvl in ("ERROR", "CRITICAL") or ev.get("error_type") or ev.get("stack_trace"):
                error_count += 1
                latest_error_type = ev.get("error_type") or latest_error_type or "UnhandledException"
                latest_stack_trace = ev.get("stack_trace") or latest_stack_trace
                latest_message = ev.get("message") or latest_message

        lat_arr = np.array(latencies, dtype=np.float64)
        sample_count = len(lat_arr)
        lat_mean = float(np.mean(lat_arr)) if sample_count > 0 else 0.0
        lat_p95 = float(np.percentile(lat_arr, 95)) if sample_count > 0 else 0.0
        lat_std = float(np.std(lat_arr)) if sample_count > 0 else 0.0
        err_ratio = (error_count / sample_count) if sample_count > 0 else 0.0

        # Feature vector: [latency_mean, latency_p95, latency_std, error_ratio, throughput_count]
        feature_vec = np.array([
            lat_mean,
            lat_p95,
            lat_std,
            err_ratio,
            float(sample_count)
        ], dtype=np.float64)

        return WindowStats(
            service_id=service_id,
            sample_count=sample_count,
            latency_mean=lat_mean,
            latency_p95=lat_p95,
            latency_std=lat_std,
            error_ratio=err_ratio,
            error_count=error_count,
            feature_vector=feature_vec,
            latest_error_type=latest_error_type,
            latest_stack_trace=latest_stack_trace,
            latest_message=latest_message,
        )

    def get_all_services(self) -> List[str]:
        return list(self._buffer.keys())
