import os
import sys
import json
import asyncio
import uuid
from typing import Any, Dict, Optional
from datetime import datetime

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
        IncidentReport,
    )

except ImportError:

    from shared.logger import get_logger

    from shared.database import (
        AsyncSessionLocal,
        IncidentReport,
    )


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
    "localhost"
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

        return max(
            0.0,
            min(
                1.0,
                result
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        return default


def safe_uuid(
    value: Optional[str],
) -> uuid.UUID:

    try:

        if value:
            return uuid.UUID(
                str(value)
            )

    except (
        ValueError,
        TypeError,
    ):

        pass

    return uuid.uuid4()


# ---------------------------------------------------------
# Create/update incident
# ---------------------------------------------------------

async def create_incident(
    alert: Dict[str, Any],
) -> IncidentReport:

    incident_id = safe_uuid(
        alert.get("incident_id")
    )

    anomaly_score = safe_float(
        alert.get(
            "anomaly_score",
            0.0
        )
    )

    service_id = str(
        alert.get(
            "service_id",
            "unknown-service"
        )
    )

    error_type = str(
        alert.get(
            "error_type",
            "SystemAnomaly"
        )
    )

    stack_trace = str(
        alert.get(
            "stack_trace",
            ""
        )
    )

    reason = str(
        alert.get(
            "reason",
            ""
        )
    )

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(IncidentReport).where(
                IncidentReport.id == incident_id
            )
        )

        incident = (
            result.scalar_one_or_none()
        )

        if incident is None:

            incident = IncidentReport(
                id=incident_id,
                service_id=service_id,
                error_type=error_type,
                stack_trace=stack_trace,
                reason=reason,
                anomaly_score=anomaly_score,
                status="OPEN",
                is_diagnosed=False,
            )

            session.add(
                incident
            )

            logger.info(
                "Created incident %s | score=%.4f",
                incident_id,
                anomaly_score,
            )

        else:

            incident.anomaly_score = (
                anomaly_score
            )

            incident.service_id = (
                service_id
            )

            incident.error_type = (
                error_type
            )

            incident.stack_trace = (
                stack_trace
            )

            incident.reason = (
                reason
            )

            logger.info(
                "Updated incident %s | score=%.4f",
                incident_id,
                anomaly_score,
            )

        await session.commit()

        await session.refresh(
            incident
        )

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
            select(IncidentReport).where(
                IncidentReport.id == incident_id
            )
        )

        incident = (
            result.scalar_one_or_none()
        )

        if incident is None:

            logger.error(
                "Incident %s not found.",
                incident_id
            )

            return

        incident.ai_root_cause = (
            root_cause
        )

        incident.ai_suggested_patch = (
            suggested_patch
        )

        incident.is_diagnosed = True

        await session.commit()

        logger.info(
            "Incident %s diagnosis saved successfully.",
            incident_id
        )


# ---------------------------------------------------------
# Retrieve historical incidents
# ---------------------------------------------------------

async def retrieve_similar_incidents(
    stack_trace: str,
    error_type: str,
) -> list:

    try:

        results = await (
            vector_store.search_similar_incidents(
                stack_trace=stack_trace,
                error_type=error_type,
                top_k=5,
            )
        )

        return results or []

    except Exception as exc:

        logger.warning(
            "RAG retrieval failed: %s",
            exc
        )

        return []


# ---------------------------------------------------------
# Generate embedding and store it
# ---------------------------------------------------------

async def store_embedding(
    incident_id: uuid.UUID,
    text: str,
) -> None:

    try:

        # This is the actual API from embeddings.py.
        embedding = embedder.get_embedding(
            text
        )

        await vector_store.add_incident(
            incident_id=incident_id,
            text=text,
            embedding=embedding,
        )

        logger.info(
            "Embedding stored for incident %s.",
            incident_id
        )

    except Exception as exc:

        logger.warning(
            "Embedding storage failed for %s: %s",
            incident_id,
            exc
        )


# ---------------------------------------------------------
# Process anomaly
# ---------------------------------------------------------

async def process_anomaly(
    alert: Dict[str, Any],
) -> None:

    incident_id = safe_uuid(
        alert.get("incident_id")
    )

    service_id = str(
        alert.get(
            "service_id",
            "unknown-service"
        )
    )

    error_type = str(
        alert.get(
            "error_type",
            "SystemAnomaly"
        )
    )

    stack_trace = str(
        alert.get(
            "stack_trace",
            ""
        )
    )

    reason = str(
        alert.get(
            "reason",
            ""
        )
    )

    anomaly_score = safe_float(
        alert.get(
            "anomaly_score",
            0.0
        )
    )

    logger.info(
        "Received anomaly event | "
        "incident_id=%s | "
        "service=%s | "
        "score=%.4f",
        incident_id,
        service_id,
        anomaly_score,
    )

    # -----------------------------------------------------
    # 1. Create incident with score
    # -----------------------------------------------------

    await create_incident(
        alert
    )

    logger.info(
        "Diagnosing Incident %s | "
        "service=%s | score=%.4f",
        incident_id,
        service_id,
        anomaly_score,
    )

    # -----------------------------------------------------
    # 2. Build embedding text
    # -----------------------------------------------------

    embedding_text = (
        f"Service: {service_id}\n"
        f"Error Type: {error_type}\n"
        f"Stack Trace: {stack_trace}\n"
        f"Reason: {reason}"
    )

    # -----------------------------------------------------
    # 3. Store embedding
    # -----------------------------------------------------

    await store_embedding(
        incident_id,
        embedding_text,
    )

    # -----------------------------------------------------
    # 4. Retrieve similar historical incidents
    # -----------------------------------------------------

    similar_records = (
        await retrieve_similar_incidents(
            stack_trace=stack_trace,
            error_type=error_type,
        )
    )

    logger.info(
        "Retrieved %d similar incidents for %s.",
        len(similar_records),
        incident_id,
    )

    # -----------------------------------------------------
    # 5. Gemini diagnosis
    # -----------------------------------------------------

    try:

        root_cause, suggested_patch = (
            await llm_doctor.diagnose_incident(
                service_id=service_id,
                error_type=error_type,
                stack_trace=stack_trace,
                reason=reason,
                similar_records=similar_records,
            )
        )

    except Exception as exc:

        logger.error(
            "Gemini diagnosis failed for %s: %s",
            incident_id,
            exc,
        )

        root_cause = (
            "Diagnostic generation failed."
        )

        suggested_patch = (
            "Review the incident manually "
            "and verify the affected service."
        )

    # -----------------------------------------------------
    # 6. Save diagnosis
    # -----------------------------------------------------

    await save_diagnosis(
        incident_id=incident_id,
        root_cause=root_cause,
        suggested_patch=suggested_patch,
    )

    logger.info(
        "Incident %s processing completed.",
        incident_id,
    )


# ---------------------------------------------------------
# Redis
# ---------------------------------------------------------

async def initialize_redis():

    redis_client = aioredis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
    )

    await redis_client.ping()

    logger.info(
        "Connected to Redis successfully."
    )

    return redis_client


# ---------------------------------------------------------
# Worker
# ---------------------------------------------------------

async def process_events():

    redis_client = (
        await initialize_redis()
    )

    pubsub = redis_client.pubsub()

    await pubsub.subscribe(
        REDIS_ANOMALY_CHANNEL
    )

    logger.info(
        "RAG AI Diagnostic Worker is active..."
    )

    try:

        async for message in pubsub.listen():

            if not message:
                continue

            if message.get("type") != "message":
                continue

            raw_data = message.get(
                "data"
            )

            if not raw_data:
                continue

            try:

                alert = json.loads(
                    raw_data
                )

            except json.JSONDecodeError as exc:

                logger.error(
                    "Invalid anomaly event: %s",
                    exc
                )

                continue

            if not isinstance(
                alert,
                dict
            ):
                continue

            try:

                await process_anomaly(
                    alert
                )

            except Exception as exc:

                logger.error(
                    "Incident processing failed: %s",
                    exc,
                    exc_info=True
                )

    except asyncio.CancelledError:

        logger.info(
            "RAG worker shutdown requested."
        )

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
    asyncio.run(
        process_events()
    )