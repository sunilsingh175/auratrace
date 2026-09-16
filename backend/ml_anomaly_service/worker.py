import asyncio
import json
import logging
import os
import socket
from datetime import datetime, timezone
from typing import Any

import redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

try:
    from backend.ml_anomaly_service.model import AnomalyDetector
    from backend.ml_anomaly_service.window_buffer import (
        LogBuffer,
        ServiceLogBufferManager,
    )
except ImportError:
    from model import AnomalyDetector
    from window_buffer import (
        LogBuffer,
        ServiceLogBufferManager,
    )


# ============================================================
# Logging
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | %(levelname)s | "
        "auratrace-ml-worker | %(message)s"
    ),
)

logger = logging.getLogger(
    "auratrace-ml-worker"
)


# ============================================================
# Environment
# ============================================================

REDIS_HOST = os.getenv(
    "REDIS_HOST",
    "redis-broker",
)

REDIS_PORT = int(
    os.getenv(
        "REDIS_PORT",
        "6379",
    )
)

STREAM_KEY = os.getenv(
    "REDIS_STREAM_KEY",
    "telemetry_stream",
)

CONSUMER_GROUP = os.getenv(
    "REDIS_CONSUMER_GROUP",
    "auratrace_workers",
)

CONSUMER_NAME = os.getenv(
    "REDIS_CONSUMER_NAME",
    f"worker-{socket.gethostname()}",
)

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

ANOMALY_THRESHOLD = float(
    os.getenv(
        "ANOMALY_THRESHOLD",
        "0.75",
    )
)

POLL_INTERVAL = int(
    os.getenv(
        "ANOMALY_POLL_INTERVAL_MS",
        "1000",
    )
) / 1000

PENDING_IDLE_TIME_MS = int(
    os.getenv(
        "REDIS_PENDING_IDLE_TIME_MS",
        "1000",
    )
)


# ============================================================
# Redis
# ============================================================

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
)


# ============================================================
# Database
# ============================================================

db_engine = None

if DATABASE_URL:

    db_engine = create_async_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )


# ============================================================
# ML & Service Rolling Buffer Manager
# ============================================================

detector = AnomalyDetector()

buffer_manager = ServiceLogBufferManager(
    window_seconds=int(
        os.getenv(
            "ANOMALY_WINDOW_SIZE_SECONDS",
            "300",
        )
    ),
    max_size=10000,
)


# ============================================================
# Redis Consumer Group
# ============================================================

def ensure_consumer_group():

    try:

        redis_client.xgroup_create(
            name=STREAM_KEY,
            groupname=CONSUMER_GROUP,
            id="0",
            mkstream=True,
        )

        logger.info(
            "Created Redis consumer group: %s",
            CONSUMER_GROUP,
        )

    except redis.exceptions.ResponseError as exc:

        if "BUSYGROUP" in str(exc):

            logger.info(
                "Redis consumer group already exists: %s",
                CONSUMER_GROUP,
            )

        else:

            raise


# ============================================================
# Parse Redis Stream Entry
# ============================================================

def parse_stream_entry(
    stream_id: str,
    fields: dict[str, Any],
) -> dict[str, Any] | None:

    try:

        payload = fields.get(
            "payload"
        )

        if payload:

            if isinstance(
                payload,
                str,
            ):

                data = json.loads(
                    payload
                )

            else:

                data = payload

        else:

            data = fields

        if not isinstance(
            data,
            dict,
        ):

            logger.warning(
                "Invalid telemetry payload | stream=%s",
                stream_id,
            )

            return None

        data["_stream_id"] = stream_id

        # Normalize stack_trace field
        stack_val = data.get("stack_trace") or data.get("raw_stack_trace") or ""
        data["stack_trace"] = stack_val
        data["raw_stack_trace"] = stack_val

        return data

    except Exception:

        logger.exception(
            "Failed to parse Redis entry | stream=%s",
            stream_id,
        )

        return None


# ============================================================
# Create PostgreSQL Incident
# ============================================================

async def create_incident(
    telemetry: dict[str, Any],
    anomaly_score: float,
) -> str | None:

    if db_engine is None:

        logger.warning(
            "DATABASE_URL not configured; "
            "incident not stored"
        )

        return None

    service_identifier = str(telemetry.get("service_id", "unknown-service"))
    stack_trace = telemetry.get("stack_trace") or telemetry.get("raw_stack_trace") or telemetry.get("message", "")
    error_type = telemetry.get("error_type") or "SystemAnomaly"
    severity = "CRITICAL" if anomaly_score >= 0.85 else ("HIGH" if anomaly_score >= 0.70 else "MEDIUM")

    try:

        async with db_engine.begin() as conn:

            # ------------------------------------------------
            # Find or create service (handles UUID and slug)
            # ------------------------------------------------
            service_db_id = None

            # 1. Try match by UUID or name
            result = await conn.execute(
                text(
                    """
                    SELECT id
                    FROM services
                    WHERE id::text = :identifier OR name = :identifier
                    LIMIT 1
                    """
                ),
                {
                    "identifier": service_identifier,
                },
            )

            service_row = result.first()

            if service_row:
                service_db_id = service_row[0]
            else:
                # 2. Auto-create service so incident foreign key constraint always succeeds
                create_res = await conn.execute(
                    text(
                        """
                        INSERT INTO services (name, description, environment, status)
                        VALUES (:name, :description, 'production', 'ACTIVE')
                        ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                        """
                    ),
                    {
                        "name": service_identifier,
                        "description": f"Auto-registered service for {service_identifier}",
                    },
                )
                created_row = create_res.first()
                if created_row:
                    service_db_id = created_row[0]

            if service_db_id is None:
                logger.warning(
                    "Service resolution failed for incident: %s",
                    service_identifier,
                )
                return None

            # ------------------------------------------------
            # Create incident in PostgreSQL matching schema
            # ------------------------------------------------

            result = await conn.execute(
                text(
                    """
                    INSERT INTO incidents (
                        service_id,
                        anomaly_score,
                        severity,
                        status,
                        error_type,
                        stack_trace,
                        is_diagnosed,
                        created_at
                    )
                    VALUES (
                        :service_id,
                        :anomaly_score,
                        :severity,
                        'OPEN',
                        :error_type,
                        :stack_trace,
                        FALSE,
                        :created_at
                    )
                    RETURNING id
                    """
                ),
                {
                    "service_id": service_db_id,
                    "anomaly_score": anomaly_score,
                    "severity": severity,
                    "error_type": error_type,
                    "stack_trace": stack_trace,
                    "created_at": datetime.now(timezone.utc),
                },
            )

            row = result.first()

            if row:

                incident_id = str(
                    row[0]
                )

                logger.info(
                    "Incident created in PostgreSQL | id=%s | score=%.4f | severity=%s",
                    incident_id,
                    anomaly_score,
                    severity,
                )

                return incident_id

    except Exception:

        logger.exception(
            "Failed to create incident in database"
        )

    return None


# ============================================================
# Publish Anomaly Event
# ============================================================

def publish_anomaly(
    telemetry: dict[str, Any],
    anomaly_score: float,
    incident_id: str | None,
):

    stack_trace = telemetry.get("stack_trace") or telemetry.get("raw_stack_trace") or ""
    service_id = str(telemetry.get("service_id", "unknown-service"))
    error_type = telemetry.get("error_type") or "SystemAnomaly"
    message = telemetry.get("message") or telemetry.get("log_message") or f"Anomaly detected in {service_id}"

    event = {
        "type": "ANOMALY_DETECTED",
        "incident_id": incident_id,
        "service_id": service_id,
        "message": message,
        "error_type": error_type,
        "stack_trace": stack_trace,
        "raw_stack_trace": stack_trace,
        "latency_ms": telemetry.get(
            "latency_ms", 0.0
        ),
        "status_code": telemetry.get(
            "status_code", 500
        ),
        "anomaly_score": anomaly_score,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    try:

        redis_client.publish(
            os.getenv(
                "REDIS_ANOMALY_CHANNEL",
                "anomaly_events",
            ),
            json.dumps(
                event
            ),
        )

        logger.info(
            "Published anomaly event | service=%s | incident=%s | score=%.4f",
            service_id,
            incident_id,
            anomaly_score,
        )

    except Exception:

        logger.exception(
            "Failed to publish anomaly event"
        )


# ============================================================
# Process One Telemetry Message
# ============================================================

async def process_message(
    stream_id: str,
    fields: dict[str, Any],
):

    telemetry = parse_stream_entry(
        stream_id,
        fields,
    )

    if telemetry is None:
        return

    service_id = str(
        telemetry.get(
            "service_id",
            "unknown",
        )
    )

    logger.info(
        "Processing telemetry | "
        "stream_id=%s | service=%s",
        stream_id,
        service_id,
    )

    # --------------------------------------------------------
    # Add telemetry to service-specific 5-minute rolling window
    # --------------------------------------------------------

    buffer_manager.add_log(
        telemetry
    )

    window_len = buffer_manager.get_buffer_size(service_id)

    logger.info(
        "Service rolling window size | service=%s | size=%d",
        service_id,
        window_len,
    )

    # --------------------------------------------------------
    # Generate service-specific features
    # --------------------------------------------------------

    features = buffer_manager.extract_features(service_id)

    logger.info(
        "Feature vector generated | service=%s | "
        "shape=%s | features=%s",
        service_id,
        features.shape,
        buffer_manager.get_feature_dict(service_id),
    )

    # --------------------------------------------------------
    # Run Isolation Forest
    # --------------------------------------------------------

    try:

        result = detector.analyze(
            features
        )

        anomaly_score = float(
            result.get(
                "anomaly_score",
                0.0,
            )
        )

        is_anomaly = bool(
            result.get(
                "is_anomaly",
                False,
            )
        )

    except Exception:

        logger.exception(
            "ML prediction failed"
        )

        anomaly_score = 0.0
        is_anomaly = False

    logger.info(
        "ML result | "
        "service=%s | score=%.4f | anomaly=%s",
        service_id,
        anomaly_score,
        is_anomaly,
    )

    # --------------------------------------------------------
    # Incident threshold
    # --------------------------------------------------------

    if (
        is_anomaly
        and anomaly_score >= ANOMALY_THRESHOLD
    ):

        logger.warning(
            "ANOMALY DETECTED | "
            "service=%s | score=%.4f",
            service_id,
            anomaly_score,
        )

        incident_id = await create_incident(
            telemetry,
            anomaly_score,
        )

        publish_anomaly(
            telemetry,
            anomaly_score,
            incident_id,
        )

        logger.info(
            "AI diagnostic pipeline trigger prepared | "
            "incident=%s",
            incident_id,
        )

    else:

        logger.info(
            "Below incident threshold | "
            "service=%s | score=%.4f | threshold=%.4f",
            service_id,
            anomaly_score,
            ANOMALY_THRESHOLD,
        )


# ============================================================
# Process Redis Entries
# ============================================================

async def process_entries(
    messages,
):

    if not messages:
        return

    logger.info(
        "Processing %d Redis stream batch(es)",
        len(messages),
    )

    for stream_name, entries in messages:

        logger.info(
            "Processing stream=%s | entries=%d",
            stream_name,
            len(entries),
        )

        for stream_id, fields in entries:

            try:

                logger.info(
                    "Received Redis entry | stream_id=%s",
                    stream_id,
                )

                await process_message(
                    stream_id,
                    fields,
                )

                # ACK only after successful processing.
                redis_client.xack(
                    STREAM_KEY,
                    CONSUMER_GROUP,
                    stream_id,
                )

                logger.info(
                    "Message acknowledged | stream_id=%s",
                    stream_id,
                )

            except Exception:

                logger.exception(
                    "Message processing failed | "
                    "stream_id=%s",
                    stream_id,
                )

                # Failed messages remain pending.


# ============================================================
# Read Pending Messages
# ============================================================

def read_pending_messages():

    try:

        messages = redis_client.xreadgroup(
            groupname=CONSUMER_GROUP,
            consumername=CONSUMER_NAME,
            streams={
                STREAM_KEY: "0",
            },
            count=10,
            block=100,
        )

        if messages:

            actual_entries = sum(
                len(entries)
                for _, entries in messages
            )

            if actual_entries > 0:

                logger.warning(
                    "Redis recovery: found %d pending "
                    "message(s) owned by current consumer",
                    actual_entries,
                )

                return messages

        return []

    except Exception:

        logger.exception(
            "Redis pending-message recovery failed"
        )

        return []


# ============================================================
# Claim Stale Pending Messages
# ============================================================

def claim_stale_pending_messages():

    try:

        next_start_id, entries, deleted_ids = (
            redis_client.xautoclaim(
                name=STREAM_KEY,
                groupname=CONSUMER_GROUP,
                consumername=CONSUMER_NAME,
                min_idle_time=PENDING_IDLE_TIME_MS,
                start_id="0-0",
                count=10,
            )
        )

        if entries:

            logger.warning(
                "Redis recovery: claimed %d stale "
                "pending message(s) from previous consumer(s)",
                len(entries),
            )

            for stream_id, _ in entries:

                logger.warning(
                    "Claimed pending message | stream_id=%s",
                    stream_id,
                )

            return [
                (
                    STREAM_KEY,
                    entries,
                )
            ]

        logger.info(
            "Redis recovery: no stale pending messages found"
        )

        return []

    except Exception:

        logger.exception(
            "Redis XAUTOCLAIM recovery failed"
        )

        return []


# ============================================================
# Read New Messages
# ============================================================

def read_new_messages():

    try:

        messages = redis_client.xreadgroup(
            groupname=CONSUMER_GROUP,
            consumername=CONSUMER_NAME,
            streams={
                STREAM_KEY: ">",
            },
            count=10,
            block=1000,
        )

        return messages or []

    except Exception:

        logger.exception(
            "Redis new-message read failed"
        )

        return []


# ============================================================
# Main Consumer Loop
# ============================================================

async def consume_stream():

    ensure_consumer_group()

    logger.info(
        "ML worker started"
    )

    logger.info(
        "Stream: %s",
        STREAM_KEY,
    )

    logger.info(
        "Consumer group: %s",
        CONSUMER_GROUP,
    )

    logger.info(
        "Consumer: %s",
        CONSUMER_NAME,
    )

    logger.info(
        "Anomaly threshold: %.2f",
        ANOMALY_THRESHOLD,
    )

    logger.info(
        "Rolling window: %d seconds",
        int(
            os.getenv(
                "ANOMALY_WINDOW_SIZE_SECONDS",
                "300",
            )
        ),
    )

    logger.info(
        "Pending idle recovery time: %d ms",
        PENDING_IDLE_TIME_MS,
    )

    # --------------------------------------------------------
    # Recover current consumer's pending messages
    # --------------------------------------------------------

    pending = read_pending_messages()

    if pending:

        logger.warning(
            "Recovering pending messages for consumer=%s",
            CONSUMER_NAME,
        )

        await process_entries(
            pending
        )

    # --------------------------------------------------------
    # Claim stale messages from old consumers
    # --------------------------------------------------------

    stale_pending = claim_stale_pending_messages()

    if stale_pending:

        logger.warning(
            "Recovering stale pending messages for consumer=%s",
            CONSUMER_NAME,
        )

        await process_entries(
            stale_pending
        )

    # --------------------------------------------------------
    # Normal stream consumption
    # --------------------------------------------------------

    while True:

        try:

            messages = read_new_messages()

            if messages:

                await process_entries(
                    messages
                )

            await asyncio.sleep(
                POLL_INTERVAL
            )

        except asyncio.CancelledError:

            raise

        except Exception:

            logger.exception(
                "Consumer loop error"
            )

            await asyncio.sleep(
                2
            )


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(
            consume_stream()
        )

    except KeyboardInterrupt:

        logger.info(
            "ML worker stopped"
        )