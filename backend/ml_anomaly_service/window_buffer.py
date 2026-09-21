import time
from collections import deque
from typing import Any

import numpy as np


# ============================================================
# Trace ML Feature Definition
# ============================================================
#
# The Isolation Forest model must be trained using these
# features in exactly this order.
#
# 1. error_count
# 2. request_count
# 3. error_rate
# 4. avg_latency_ms
# 5. max_latency_ms
# 6. p95_latency_ms
# 7. status_5xx_rate
# 8. unique_error_types
#
# ============================================================

FEATURE_NAMES = [
    "error_count",
    "request_count",
    "error_rate",
    "avg_latency_ms",
    "max_latency_ms",
    "p95_latency_ms",
    "status_5xx_rate",
    "unique_error_types",
]


class LogBuffer:
    """
    Maintains a time-based rolling telemetry window.

    Default:
        5 minutes / 300 seconds
    """

    def __init__(
        self,
        window_seconds: int = 300,
        max_size: int = 10000,
    ):
        self.window_seconds = window_seconds
        self.max_size = max_size

        self.logs: deque[
            tuple[float, dict[str, Any]]
        ] = deque()

    # ========================================================
    # Add telemetry
    # ========================================================

    def add_log(
        self,
        log_payload: dict[str, Any],
    ) -> None:

        now = time.time()

        self.logs.append(
            (
                now,
                log_payload,
            )
        )

        # Prevent unlimited memory growth.
        while len(self.logs) > self.max_size:
            self.logs.popleft()

        self._remove_expired(now)

    # ========================================================
    # Remove expired telemetry
    # ========================================================

    def _remove_expired(
        self,
        now: float | None = None,
    ) -> None:

        if now is None:
            now = time.time()

        cutoff = now - self.window_seconds

        while self.logs:

            timestamp, _ = self.logs[0]

            if timestamp >= cutoff:
                break

            self.logs.popleft()

    # ========================================================
    # Get active logs
    # ========================================================

    def get_logs(self) -> list[dict[str, Any]]:

        now = time.time()

        self._remove_expired(now)

        return [
            payload
            for _, payload in self.logs
        ]

    # ========================================================
    # Safe float conversion
    # ========================================================

    @staticmethod
    def _float(
        value: Any,
        default: float = 0.0,
    ) -> float:

        try:

            if value is None:
                return default

            return float(value)

        except (
            TypeError,
            ValueError,
        ):

            return default

    # ========================================================
    # Percentile
    # ========================================================

    @staticmethod
    def _percentile(
        values: list[float],
        percentile: float,
    ) -> float:

        if not values:
            return 0.0

        return float(
            np.percentile(
                np.asarray(
                    values,
                    dtype=np.float32,
                ),
                percentile,
            )
        )

    # ========================================================
    # Extract ML features
    # ========================================================

    def extract_features(self) -> np.ndarray:

        logs = self.get_logs()

        if not logs:

            return np.zeros(
                (
                    1,
                    len(FEATURE_NAMES),
                ),
                dtype=np.float32,
            )

        # ----------------------------------------------------
        # Request count
        # ----------------------------------------------------

        request_count = len(logs)

        # ----------------------------------------------------
        # Error count
        # ----------------------------------------------------

        error_count = sum(
            1
            for log in logs
            if (
                str(
                    log.get(
                        "level",
                        "",
                    )
                ).upper()
                == "ERROR"
                or self._float(
                    log.get(
                        "status_code",
                        200,
                    )
                )
                >= 500
            )
        )

        # ----------------------------------------------------
        # Error rate
        # ----------------------------------------------------

        error_rate = (
            error_count / request_count
            if request_count > 0
            else 0.0
        )

        # ----------------------------------------------------
        # Latency metrics
        # ----------------------------------------------------

        latencies = [
            self._float(
                log.get(
                    "latency_ms",
                    0,
                )
            )
            for log in logs
        ]

        latencies = [
            value
            for value in latencies
            if value >= 0
        ]

        if latencies:

            avg_latency_ms = float(
                np.mean(
                    latencies
                )
            )

            max_latency_ms = float(
                max(latencies)
            )

            p95_latency_ms = self._percentile(
                latencies,
                95,
            )

        else:

            avg_latency_ms = 0.0
            max_latency_ms = 0.0
            p95_latency_ms = 0.0

        # ----------------------------------------------------
        # HTTP 5xx rate
        # ----------------------------------------------------

        status_5xx_count = sum(
            1
            for log in logs
            if (
                self._float(
                    log.get(
                        "status_code",
                        200,
                    )
                )
                >= 500
            )
        )

        status_5xx_rate = (
            status_5xx_count / request_count
            if request_count > 0
            else 0.0
        )

        # ----------------------------------------------------
        # Unique error types
        # ----------------------------------------------------

        error_types = {
            str(
                log.get(
                    "error_type"
                )
            ).strip()
            for log in logs
            if log.get(
                "error_type"
            )
        }

        unique_error_types = len(
            error_types
        )

        # ----------------------------------------------------
        # Final feature vector
        # ----------------------------------------------------

        features = np.array(
            [[
                float(error_count),
                float(request_count),
                float(error_rate),
                float(avg_latency_ms),
                float(max_latency_ms),
                float(p95_latency_ms),
                float(status_5xx_rate),
                float(unique_error_types),
            ]],
            dtype=np.float32,
        )

        return features

    # ========================================================
    # Feature dictionary for logging/debugging
    # ========================================================

    def get_feature_dict(self) -> dict[str, float]:

        features = self.extract_features()[0]

        return {
            name: float(value)
            for name, value in zip(
                FEATURE_NAMES,
                features,
            )
        }

    # ========================================================
    # Number of active logs
    # ========================================================

    def __len__(self) -> int:

        return len(
            self.get_logs()
        )


class ServiceLogBufferManager:
    """
    Manages isolated rolling telemetry buffers per microservice.
    Ensures that features and anomaly detection for 'payment-api'
    are never polluted by logs from 'order-service', etc.
    """

    def __init__(
        self,
        window_seconds: int = 300,
        max_size: int = 10000,
    ):
        self.window_seconds = window_seconds
        self.max_size = max_size
        self._buffers: dict[str, LogBuffer] = {}

    def get_buffer(self, service_id: str) -> LogBuffer:
        key = str(service_id or "unknown")
        if key not in self._buffers:
            self._buffers[key] = LogBuffer(
                window_seconds=self.window_seconds,
                max_size=self.max_size,
            )
        return self._buffers[key]

    def add_log(self, log_payload: dict[str, Any]) -> None:
        service_id = str(log_payload.get("service_id", "unknown"))
        buffer = self.get_buffer(service_id)
        buffer.add_log(log_payload)

    def extract_features(self, service_id: str) -> np.ndarray:
        return self.get_buffer(service_id).extract_features()

    def get_feature_dict(self, service_id: str) -> dict[str, float]:
        return self.get_buffer(service_id).get_feature_dict()

    def get_buffer_size(self, service_id: str) -> int:
        return len(self.get_buffer(service_id))

    def active_services(self) -> list[str]:
        return list(self._buffers.keys())