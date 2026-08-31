import os
import sys
import json
import asyncio
import uuid
from datetime import datetime, timezone
import redis.asyncio as aioredis
from sqlalchemy import select

# Ensure workspace and current dir are in sys.path for standalone and package execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .vector_store import vector_store
    from .llm_pipeline import llm_doctor
except (ImportError, ValueError):
    from vector_store import vector_store
    from llm_pipeline import llm_doctor

try:
    from backend.shared.database import AsyncSessionLocal, IncidentReport
    from backend.shared.logger import get_logger
except ImportError:
    from shared.database import AsyncSessionLocal, IncidentReport
    from shared.logger import get_logger

logger = get_logger("rag-diagnostic-worker")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_ANOMALY_CHANNEL = "anomaly_events"

class RAGWorker:
    def __init__(self):
        self.redis_client = None
        self._is_running = True

    async def initialize(self):
        logger.info("Connecting RAG Doctor Worker to Redis...")
        self.redis_client = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    async def run(self):
        await self.initialize()
        logger.info("RAG AI Diagnostic Worker is active...")

        while self._is_running:
            try:
                pubsub = self.redis_client.pubsub()
                await pubsub.subscribe(REDIS_ANOMALY_CHANNEL)
                
                async for message in pubsub.listen():
                    if not self._is_running: break
                    if message and message["type"] == "message":
                        try:
                            alert = json.loads(message["data"])
                            if alert.get("is_diagnosed"): continue
                            await self._handle_anomaly_alert(alert)
                        except Exception as e:
                            logger.error(f"Failed to process alert: {e}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker loop error: {e}")
                await asyncio.sleep(3)

    async def _handle_anomaly_alert(self, alert: dict):
        incident_id = alert.get("incident_id")
        service_id = alert.get("service_id", "default")
        error_type = alert.get("error_type", "SystemAnomaly")
        stack_trace = alert.get("stack_trace", "")
        reason = alert.get("reason", "")

        logger.info(f"Diagnosing Incident {incident_id}...")

        similar_records = await vector_store.search_similar_incidents(stack_trace, error_type)
        root_cause, patch = await llm_doctor.diagnose_incident(
            service_id, error_type, stack_trace, reason, similar_records
        )

        if incident_id:
            try:
                inc_uuid = uuid.UUID(incident_id)
                async with AsyncSessionLocal() as session:
                    res = await session.execute(select(IncidentReport).where(IncidentReport.id == inc_uuid))
                    incident = res.scalars().first()
                    
                    if not incident:
                        incident = IncidentReport(id=inc_uuid, service_id=service_id, error_type=error_type, stack_trace=stack_trace, reason=reason)
                        session.add(incident)
                        
                    incident.ai_root_cause = root_cause
                    incident.ai_suggested_patch = patch
                    incident.is_diagnosed = True
                    await session.commit()
            except Exception as e:
                logger.error(f"Database update failed: {e}")

        # Broadcast completed diagnosis
        try:
            alert.update({"ai_root_cause": root_cause, "ai_suggested_patch": patch, "is_diagnosed": True})
            await self.redis_client.publish(REDIS_ANOMALY_CHANNEL, json.dumps(alert))
        except Exception as e:
            logger.error(f"Failed to broadcast diagnosis: {e}")

if __name__ == "__main__":
    asyncio.run(RAGWorker().run())