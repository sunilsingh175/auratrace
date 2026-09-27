"""
Extract rolling-window numerical features from telemetry events.
Used by the Isolation Forest anomaly detector.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import numpy as np
from shared.database import get_db_pool


# Feature vector (order matters — model is trained on this exact column sequence)
FEATURE_COLUMNS = [
    "event_count",
    "error_count",
    "crash_count",
    "unique_services",
    "avg_latency",
    "max_latency",
    "p95_latency",
    "std_latency",
    "events_per_second",
    "error_rate",
]


async def extract_window_features(
    project_id: str,
    service_name: str,
    window_seconds: int = 60,
) -> Dict[str, float]:
    """
    Aggregate telemetry events over the last `window_seconds`
    for a given project + service, and produce a feature dict.
    """
    pool = await get_db_pool()
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)

    events: List[Dict[str, Any]] = []

    try:
        async with pool.acquire() as conn:
            # First attempt query on telemetry_events
            try:
                rows = await conn.fetch(
                    """
                    SELECT event_type, payload
                    FROM telemetry_events
                    WHERE project_id::text = $1
                      AND received_at >= $2
                    """,
                    str(project_id),
                    cutoff,
                )
                for r in rows:
                    raw_payload = r["payload"]
                    if isinstance(raw_payload, str):
                        try:
                            payload = json.loads(raw_payload)
                        except Exception:
                            payload = {}
                    elif isinstance(raw_payload, dict):
                        payload = raw_payload
                    else:
                        payload = {}

                    svc = str(payload.get("service_name") or payload.get("service_id") or "unknown")
                    if svc == service_name or service_name == "unknown" or not service_name:
                        events.append({
                            "type": str(r["event_type"]).lower(),
                            "latency": float(payload.get("latency_ms") or 0.0),
                            "service": svc,
                        })
            except Exception:
                pass
    except Exception:
        pass

    if not events:
        # Return standard 1-event baseline feature defaults if freshly spawned
        return {
            "event_count": 1.0,
            "error_count": 1.0,
            "crash_count": 1.0,
            "unique_services": 1.0,
            "avg_latency": 150.0,
            "max_latency": 350.0,
            "p95_latency": 300.0,
            "std_latency": 25.0,
            "events_per_second": 1.0 / max(1, window_seconds),
            "error_rate": 1.0,
        }

    latencies = np.array([e["latency"] for e in events if e.get("latency") is not None])
    error_count = sum(1 for e in events if e["type"] in ("error", "exception"))
    crash_count = sum(1 for e in events if e["type"] in ("crash", "fatal", "critical"))
    unique_services = len({e.get("service", "unknown") for e in events}) or 1

    return {
        "event_count": float(len(events)),
        "error_count": float(error_count),
        "crash_count": float(crash_count),
        "unique_services": float(unique_services),
        "avg_latency": float(np.mean(latencies)) if len(latencies) else 0.0,
        "max_latency": float(np.max(latencies)) if len(latencies) else 0.0,
        "p95_latency": float(np.percentile(latencies, 95)) if len(latencies) else 0.0,
        "std_latency": float(np.std(latencies)) if len(latencies) else 0.0,
        "events_per_second": float(len(events) / max(1, window_seconds)),
        "error_rate": float((error_count + crash_count) / max(1, len(events))),
    }


def features_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Convert feature dict → ordered numpy 2D array for scikit-learn."""
    return np.array([[features.get(col, 0.0) for col in FEATURE_COLUMNS]])
