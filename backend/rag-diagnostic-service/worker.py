"""
AuraTrace RAG Diagnostic Worker
Listens to anomaly alerts, matches stack traces via pgvector, executes LLM diagnosis, and updates Incident Reports.
"""

import os
import json
import asyncio
import uuid
from datetime import datetime, timezone
import redis.asyncio as aioredis
from sqlalchemy import select

try:
    from .vector_store import vector_store
    from .llm_pipeline import llm_doctor
except ImportError:
    from vector_store import vector_store
    from llm_pipeline import llm_doctor
from backend.shared.database import AsyncSessionLocal, IncidentReport
from backend.shared.logger import get_logger

logger = get_logger("rag-diagnostic-worker")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_ANOMALY_CHANNEL = os.getenv("REDIS_ANOMALY_CHANNEL", "anomaly_alerts")


class RAGWorker:
    def __init__(self):
        self.redis_client: aioredis.Redis = None
        self._is_running = True

    async def initialize(self):
        logger.info("Connecting RAG Doctor Worker to Redis (%s:%s)...", REDIS_HOST, REDIS_PORT)
        self.redis_client = aioredis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_timeout=10.0,
        )

    async def run(self):
        await self.initialize()
        logger.info("RAG AI Diagnostic Doctor Worker is active and listening for anomaly alerts...")

        while self._is_running:
            try:
                pubsub = self.redis_client.pubsub()
                await pubsub.subscribe(REDIS_ANOMALY_CHANNEL)
                logger.info("Subscribed to channel '%s' for anomaly diagnostics.", REDIS_ANOMALY_CHANNEL)

                async for message in pubsub.listen():
                    if not self._is_running:
                        break
                    if message and message["type"] == "message":
                        try:
                            alert_data = json.loads(message["data"])
                            # Only process alerts that haven't been diagnosed yet
                            if alert_data.get("is_diagnosed"):
                                continue
                            await self._handle_anomaly_alert(alert_data)
                        except Exception as parse_err:
                            logger.error("Failed to process pub/sub alert: %s", parse_err)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in RAG worker loop: %s. Reconnecting in 3s...", e)
                await asyncio.sleep(3)

    async def _handle_anomaly_alert(self, alert: dict):
        incident_id_str = alert.get("incident_id")
        service_id = alert.get("service_id", "default-service")
        error_type = alert.get("error_type", "SystemAnomaly")
        stack_trace = alert.get("stack_trace", "")
        reason = alert.get("reason", "Anomaly flagged by ML Worker")

        logger.info("🩺 Diagnosing Incident %s for service '%s' (%s)...", incident_id_str, service_id, error_type)

        # 1. Vector similarity search in pgvector knowledge base
        similar_records = await vector_store.search_similar_incidents(
            stack_trace=stack_trace,
            error_type=error_type,
            top_k=3,
        )

        # 2. LLM / Gemini / Heuristic synthesis
        root_cause, suggested_patch = await llm_doctor.diagnose_incident(
            service_id=service_id,
            error_type=error_type,
            stack_trace=stack_trace,
            reason=reason,
            similar_records=similar_records,
        )

        logger.info("Diagnosis synthesized for incident %s. Updating database...", incident_id_str)

        # 3. Update Incident Report in PostgreSQL
        if incident_id_str:
            try:
                inc_uuid = uuid.UUID(incident_id_str)
                async with AsyncSessionLocal() as session:
                    res = await session.execute(
                        select(IncidentReport).where(IncidentReport.id == inc_uuid)
                    )
                    incident = res.scalars().first()
                    if incident:
                        incident.ai_root_cause = root_cause
                        incident.ai_suggested_patch = suggested_patch
                        await session.commit()
                        logger.info("Updated Incident %s in database with AI diagnosis.", incident_id_str)
                    else:
                        logger.warning("Incident %s not found in database to update.", incident_id_str)
            except Exception as db_err:
                logger.error("Failed to update incident %s in DB: %s", incident_id_str, db_err)

        # 4. Broadcast updated diagnosis event with is_diagnosed=True
        try:
            broadcast_payload = {
                "incident_id": incident_id_str,
                "service_id": service_id,
                "error_type": error_type,
                "ai_root_cause": root_cause,
                "ai_suggested_patch": suggested_patch,
                "is_diagnosed": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await self.redis_client.publish(
                REDIS_ANOMALY_CHANNEL,
                json.dumps(broadcast_payload)
            )
        except Exception as pub_err:
            logger.error("Failed to broadcast diagnosed alert: %s", pub_err)


async def main():
    worker = RAGWorker()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
