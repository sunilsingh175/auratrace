import os
import sys
import json
import asyncio
import uuid
from typing import Any, Dict, Optional
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import select


# ---------------------------------------------------------
# Path setup
# ---------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

WORKSPACE_DIR = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "..")
)

sys.path.insert(
    0,
    WORKSPACE_DIR
)

sys.path.insert(
    0,
    CURRENT_DIR
)


# ---------------------------------------------------------
# Shared imports
# ---------------------------------------------------------

try:
    from backend.shared.logger import get_logger
    from backend.shared.database import (
        AsyncSessionLocal,
        Incident,
        HistoricalFix,
        get_or_create_service_id,
    )
except ImportError:
    try:
        from shared.logger import get_logger
        from shared.database import (
            AsyncSessionLocal,
            Incident,
            HistoricalFix,
            get_or_create_service_id,
        )
    except ImportError:
        import logging
        get_logger = lambda name: logging.getLogger(name)
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres_password_123@postgres-db:5432/auratrace_db")
        _engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        AsyncSessionLocal = async_sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------
# Local imports
# ---------------------------------------------------------

from vector_store import vector_store
from embeddings import embedder
from llm_pipeline import llm_doctor


# ---------------------------------------------------------
# Logger
# ---------------------------------------------------------

logger = get_logger(
    "rag-diagnostic-worker"
)


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

REDIS_HOST = os.getenv(
    "REDIS_HOST",
    "redis-broker"
)

REDIS_PORT = int(
    os.getenv(
        "REDIS_PORT",
        "6379"
    )
)

REDIS_ANOMALY_CHANNEL = os.getenv(
    "REDIS_ANOMALY_CHANNEL",
    "anomaly_events"
)


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def safe_float(
    value: Any,
    default: float = 0.0,
) -> float:
    try:
        result = float(value)
        return max(0.0, min(1.0, result))
    except (TypeError, ValueError):
        return default


def safe_uuid(
    value: Optional[str],
) -> uuid.UUID:
    try:
        if value:
            return uuid.UUID(str(value))
    except (ValueError, TypeError):
        pass
    return uuid.uuid4()


# ---------------------------------------------------------
# Create or find incident
# ---------------------------------------------------------

async def get_or_create_incident(
    alert: Dict[str, Any],
) -> Incident:

    incident_id = safe_uuid(
        alert.get("incident_id")
    )

    anomaly_score = safe_float(
        alert.get("anomaly_score", 0.0)
    )

    service_identifier = str(
        alert.get("service_id", "unknown-service")
    )

    error_type = str(
        alert.get("error_type", "SystemAnomaly")
    )

    stack_trace = str(
        alert.get("stack_trace") or alert.get("raw_stack_trace") or ""
    )

    severity = "CRITICAL" if anomaly_score >= 0.85 else ("HIGH" if anomaly_score >= 0.70 else "MEDIUM")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Incident).where(
                Incident.id == incident_id
            )
        )
        incident = result.scalar_one_or_none()

        if incident is None:
            service_db_id = await get_or_create_service_id(session, service_identifier)

            incident = Incident(
                id=incident_id,
                service_id=service_db_id,
                error_type=error_type,
                stack_trace=stack_trace,
                anomaly_score=anomaly_score,
                severity=severity,
                status="OPEN",
                is_diagnosed=False,
                created_at=datetime.now(timezone.utc),
            )
            session.add(incident)
            logger.info("Created incident %s in database | score=%.4f", incident_id, anomaly_score)
        else:
            incident.anomaly_score = anomaly_score
            incident.error_type = error_type
            if stack_trace:
                incident.stack_trace = stack_trace

        await session.commit()
        await session.refresh(incident)
        return incident


# ---------------------------------------------------------
# Save diagnosis
# ---------------------------------------------------------

async def save_diagnosis(
    incident_id: uuid.UUID,
    root_cause: str,
    suggested_patch: str,
) -> None:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Incident).where(
                Incident.id == incident_id
            )
        )
        incident = result.scalar_one_or_none()

        if incident is None:
            logger.error("Incident %s not found for saving diagnosis.", incident_id)
            return

        incident.root_cause = root_cause
        incident.suggested_patch = suggested_patch
        incident.is_diagnosed = True

        await session.commit()
        logger.info("Incident %s diagnosis saved successfully.", incident_id)


# ---------------------------------------------------------
# Process anomaly event
# ---------------------------------------------------------

async def process_anomaly(
    alert: Dict[str, Any],
    redis_client: aioredis.Redis,
) -> None:

    incident_id = safe_uuid(
        alert.get("incident_id")
    )

    service_id = str(
        alert.get("service_id", "unknown-service")
    )

    error_type = str(
        alert.get("error_type", "SystemAnomaly")
    )

    stack_trace = str(
        alert.get("stack_trace") or alert.get("raw_stack_trace") or ""
    )

    message = str(
        alert.get("message") or alert.get("log_message") or ""
    )

    anomaly_score = safe_float(
        alert.get("anomaly_score", 0.0)
    )

    logger.info(
        "RAG Doctor processing anomaly | incident_id=%s | service=%s | score=%.4f",
        incident_id,
        service_id,
        anomaly_score,
    )

    # 1. Ensure incident exists in PostgreSQL
    await get_or_create_incident(alert)

    # 2. Retrieve top similar historical fixes from pgvector
    similar_records = await vector_store.search_similar_fixes(
        stack_trace=stack_trace,
        error_type=error_type,
        top_k=3,
    )

    logger.info(
        "Retrieved %d similar historical fixes from pgvector for incident %s",
        len(similar_records),
        incident_id,
    )

    # 3. Generate Gemini diagnosis
    try:
        root_cause, suggested_patch = await llm_doctor.diagnose_incident(
            service_id=service_id,
            error_type=error_type,
            stack_trace=stack_trace,
            reason=message,
            similar_records=similar_records,
        )
    except Exception as exc:
        logger.error("Gemini diagnosis synthesis error for %s: %s", incident_id, exc)
        root_cause = f"Exception {error_type} in {service_id}"
        suggested_patch = "Inspect service database connection pool and resource allocation."

    # 4. Save diagnosis to PostgreSQL
    await save_diagnosis(
        incident_id=incident_id,
        root_cause=root_cause,
        suggested_patch=suggested_patch,
    )

    # 5. Broadcast diagnosis update via Redis Pub/Sub for live WebSocket UI updates
    try:
        diagnosis_event = {
            "type": "INCIDENT_DIAGNOSED",
            "incident_id": str(incident_id),
            "service_id": service_id,
            "anomaly_score": anomaly_score,
            "error_type": error_type,
            "stack_trace": stack_trace,
            "raw_stack_trace": stack_trace,
            "ai_root_cause": root_cause,
            "ai_suggested_patch": suggested_patch,
            "is_diagnosed": True,
            "similar_incidents": similar_records,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        await redis_client.publish(
            REDIS_ANOMALY_CHANNEL,
            json.dumps(diagnosis_event),
        )

        logger.info(
            "Published INCIDENT_DIAGNOSED event for incident %s",
            incident_id,
        )
    except Exception as exc:
        logger.warning("Failed to publish INCIDENT_DIAGNOSED event: %s", exc)


# ---------------------------------------------------------
# Redis Connection
# ---------------------------------------------------------

async def initialize_redis():

    redis_client = aioredis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
    )

    await redis_client.ping()
    logger.info("Connected to Redis successfully on %s:%s", REDIS_HOST, REDIS_PORT)
    return redis_client


# ---------------------------------------------------------
# Worker Event Loop
# ---------------------------------------------------------

async def process_events():

    redis_client = await initialize_redis()

    # Sync pgvector embeddings for seed data on worker startup
    try:
        await vector_store.sync_historical_embeddings()
    except Exception as exc:
        logger.warning("Initial embedding sync notice: %s", exc)

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(REDIS_ANOMALY_CHANNEL)

    logger.info("RAG AI Diagnostic Worker is active and listening on '%s'...", REDIS_ANOMALY_CHANNEL)

    try:
        async for message in pubsub.listen():
            if not message or message.get("type") != "message":
                continue

            raw_data = message.get("data")
            if not raw_data:
                continue

            try:
                alert = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            if not isinstance(alert, dict):
                continue

            # Only process ANOMALY_DETECTED events to avoid feedback loops with INCIDENT_DIAGNOSED
            event_type = alert.get("type", "ANOMALY_DETECTED")
            if event_type != "ANOMALY_DETECTED":
                continue

            try:
                await process_anomaly(alert, redis_client)
            except Exception as exc:
                logger.error("Incident processing failed: %s", exc, exc_info=True)

    except asyncio.CancelledError:
        logger.info("RAG worker shutdown requested.")
    finally:
        try:
            await pubsub.close()
        except Exception:
            pass
        try:
            await redis_client.close()
        except Exception:
            pass


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(process_events())