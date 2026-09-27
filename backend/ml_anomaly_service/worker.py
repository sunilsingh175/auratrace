"""
AuraTrace ML Anomaly Worker.

Flow:
  1. Consume events from Redis Stream (telemetry_stream)
  2. Persist raw event to telemetry_events table
  3. For crashes/errors → extract rolling features → score with Isolation Forest
  4. If anomalous/crash → create or update incident in PostgreSQL
  5. Push incident to diagnose stream (for RAG service) and pubsub (for WebSockets)
"""
import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis

try:
    from backend.shared.config import get_settings
    from backend.shared.database import get_db_pool
    from backend.shared.sanitizer import error_signature
    from backend.ml_anomaly_service.model import AnomalyDetector, severity_from_score
    from backend.ml_anomaly_service.feature_extractor import extract_window_features
except (ImportError, ModuleNotFoundError):
    from shared.config import get_settings
    from shared.database import get_db_pool
    from shared.sanitizer import error_signature
    from ml_anomaly_service.model import AnomalyDetector, severity_from_score
    from ml_anomaly_service.feature_extractor import extract_window_features

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] ml-worker: %(message)s",
)
log = logging.getLogger("ml-worker")

settings = get_settings()
detector = AnomalyDetector()


async def handle_event(r: aioredis.Redis, data: dict):
    """Process a single telemetry event."""
    try:
        raw_payload = data.get("payload")
        if isinstance(raw_payload, str):
            try:
                payload = json.loads(raw_payload)
            except Exception:
                payload = {"message": raw_payload}
        elif isinstance(raw_payload, dict):
            payload = raw_payload
        else:
            payload = {}

        project_id = str(data.get("project_id") or payload.get("project_id") or "00000000-0000-0000-0000-000000000001")
        event_type = str(data.get("event_type") or payload.get("event_type") or "error").lower()
        service_name = str(data.get("service_name") or payload.get("service_name") or payload.get("service_id") or "unknown")
        environment = str(data.get("environment") or payload.get("environment") or "production")
        
        signature = data.get("signature") or payload.get("signature")
        if not signature:
            err_type = str(payload.get("error_type") or "UnknownError")
            err_msg = str(payload.get("error_message") or payload.get("message") or "")
            st_trace = str(payload.get("stack_trace") or payload.get("raw_stack_trace") or "")
            signature = error_signature(err_type, err_msg, st_trace)

        pool = await get_db_pool()

        # ── 1. Persist raw event to telemetry_events ──────────────
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO telemetry_events
                        (project_id, event_type, runtime, payload, received_at)
                    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                    """,
                    uuid.UUID(project_id) if len(project_id) == 36 else None,
                    event_type,
                    json.dumps(payload.get("runtime") or {}),
                    json.dumps(payload),
                )
        except Exception as e:
            log.warning("Raw telemetry_events insert warning: %s", e)

        # ── 2. Filter: only process errors / crashes ──────────────
        is_error_type = event_type in ("crash", "error", "exception", "fatal", "critical") or bool(payload.get("error_type"))
        if not is_error_type and float(payload.get("latency_ms") or 0.0) < 2000:
            return

        # ── 3. Feature extraction & Anomaly Scoring ───────────────
        window_seconds = getattr(settings, "WINDOW_SECONDS", 60) or 60
        features = await extract_window_features(project_id, service_name, window_seconds)
        
        # Merge immediate latency metric
        if payload.get("latency_ms"):
            lat = float(payload["latency_ms"])
            features["max_latency"] = max(features.get("max_latency", 0.0), lat)
            features["avg_latency"] = (features.get("avg_latency", lat) + lat) / 2.0

        score, is_anomaly = detector.score(features)

        log.info(
            "Scored %s/%s → score=%.3f anomaly=%s (events=%d)",
            project_id[:8], service_name, score, is_anomaly,
            int(features.get("event_count", 1)),
        )

        # ── 4. Decide: create or update incident ──────────────────
        should_create = (
            event_type in ("crash", "fatal", "critical")
            or is_anomaly
            or score >= 0.50
            or bool(payload.get("error_type"))
        )
        if not should_create:
            return

        severity = severity_from_score(score)
        error_type_val = str(payload.get("error_type") or "RuntimeError")
        error_msg_val = str(payload.get("error_message") or payload.get("message") or "")
        stack_trace_val = str(payload.get("stack_trace") or payload.get("raw_stack_trace") or "")

        # ── 5. Deduplicate by signature within active window ──────
        existing = None
        try:
            async with pool.acquire() as conn:
                existing = await conn.fetchrow(
                    """
                    SELECT id, COALESCE(event_count, 1) as event_count, COALESCE(anomaly_score, 0) as anomaly_score
                    FROM incidents
                    WHERE project_id::text = $1
                      AND error_signature = $2
                      AND status NOT IN ('resolved', 'RESOLVED', 'ignored')
                      AND created_at > NOW() - INTERVAL '1 hour'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    str(project_id), signature,
                )
        except Exception:
            pass

        if existing:
            # Update existing incident
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE incidents
                    SET event_count = COALESCE(event_count, 1) + 1,
                        last_seen = CURRENT_TIMESTAMP,
                        anomaly_score = GREATEST(COALESCE(anomaly_score, 0), $1)
                    WHERE id = $2
                    """,
                    score, existing["id"],
                )
            log.info("📈 Updated incident %s (count=%d)", existing["id"], existing["event_count"] + 1)
            incident_id = str(existing["id"])
        else:
            # Create new incident
            new_id = uuid.uuid4()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO incidents
                        (id, project_id, error_type, error_message, root_cause, stack_trace,
                         error_signature, runtime, environment, service_name,
                         anomaly_score, severity, status, created_at, first_seen, last_seen)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'detecting', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    new_id,
                    uuid.UUID(project_id) if len(project_id) == 36 else None,
                    error_type_val,
                    error_msg_val,
                    error_msg_val,
                    stack_trace_val,
                    signature,
                    json.dumps(payload.get("runtime") or {}),
                    environment,
                    service_name,
                    score,
                    severity,
                )
            incident_id = str(new_id)
            log.info("🚨 New incident %s (severity=%s, score=%.3f)", incident_id, severity, score)

        # ── 6. Broadcast Alert to WebSockets via PubSub ───────────
        anomaly_event = {
            "type": "ANOMALY_DETECTED",
            "incident_id": incident_id,
            "project_id": project_id,
            "service_name": service_name,
            "error_type": error_type_val,
            "error_message": error_msg_val,
            "severity": severity,
            "anomaly_score": score,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await r.publish(getattr(settings, "REDIS_ANOMALY_CHANNEL", "anomaly_events"), json.dumps(anomaly_event))

        # ── 7. Push to RAG Diagnose Stream ────────────────────────
        diagnose_stream = getattr(settings, "DIAGNOSE_STREAM", "diagnose_stream")
        await r.xadd(
            diagnose_stream,
            {
                "incident_id": str(incident_id),
                "project_id": str(project_id),
                "error_type": error_type_val,
                "error_message": error_msg_val,
                "service_name": service_name,
                "stack_trace": stack_trace_val,
                "severity": severity,
            },
            maxlen=100_000,
            approximate=True,
        )

    except Exception as exc:
        log.exception("Error processing telemetry event: %s", exc)


async def ensure_consumer_group(r: aioredis.Redis):
    """Create the consumer group if it doesn't exist."""
    stream_key = getattr(settings, "REDIS_STREAM_KEY", "telemetry_stream")
    group_name = getattr(settings, "STREAM_GROUP_ML", "ml-workers")
    try:
        await r.xgroup_create(
            stream_key,
            group_name,
            id="0",
            mkstream=True,
        )
        log.info("✅ Created consumer group %s on %s", group_name, stream_key)
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            log.warning("Consumer group note: %s", e)


async def main():
    log.info("🎧 ML Anomaly Worker starting...")
    r = await aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=30,
        socket_connect_timeout=10,
        socket_keepalive=True,
        health_check_interval=15,
        retry_on_timeout=True,
    )
    await ensure_consumer_group(r)

    stream_key = getattr(settings, "REDIS_STREAM_KEY", "telemetry_stream")
    group_name = getattr(settings, "STREAM_GROUP_ML", "ml-workers")
    consumer_name = f"ml-{os.getpid()}"
    
    log.info("Listening on stream=%s group=%s consumer=%s", stream_key, group_name, consumer_name)

    while True:
        try:
            msgs = await r.xreadgroup(
                group_name,
                consumer_name,
                {stream_key: ">"},
                count=20,
                block=2000,
            )

            if not msgs:
                continue

            for _, entries in msgs:
                for msg_id, data in entries:
                    try:
                        await handle_event(r, data)
                        await r.xack(
                            stream_key,
                            group_name,
                            msg_id,
                        )
                    except Exception as e:
                        log.exception("Event handling failed for %s: %s", msg_id, e)

        except aioredis.ConnectionError as e:
            log.error("Redis connection lost: %s — retrying in 5s", e)
            await asyncio.sleep(5)
        except (aioredis.TimeoutError, asyncio.TimeoutError):
            await asyncio.sleep(0.1)
        except Exception as e:
            if "timeout" in str(e).lower():
                await asyncio.sleep(0.1)
            else:
                log.exception("Consumer loop error: %s", e)
                await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())