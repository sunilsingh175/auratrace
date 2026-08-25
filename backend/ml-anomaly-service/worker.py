"""
AuraTrace ML Anomaly Detection Worker
Consumes Redis Stream telemetry, maintains rolling feature windows, evaluates Isolation Forest, and triggers alerts.
"""

import os
import json
import time
import asyncio
import uuid
from datetime import datetime, timezone
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from .window_buffer import RollingWindowBuffer
    from .model import AnomalyDetector
except ImportError:
    from window_buffer import RollingWindowBuffer
    from model import AnomalyDetector
from backend.shared.database import (
    AsyncSessionLocal,
    TelemetryLog,
    IncidentReport,
)
from backend.shared.logger import get_logger

logger = get_logger("ml-anomaly-worker")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_STREAM_KEY = os.getenv("REDIS_STREAM_KEY", "telemetry_stream")
REDIS_ANOMALY_CHANNEL = os.getenv("REDIS_ANOMALY_CHANNEL", "anomaly_alerts")
REDIS_CONSUMER_GROUP = os.getenv("REDIS_CONSUMER_GROUP", "auratrace_workers")
CONSUMER_NAME = f"ml-worker-{uuid.uuid4().hex[:6]}"
WINDOW_SIZE_SECONDS = int(os.getenv("ANOMALY_WINDOW_SIZE_SECONDS", 300))
POLL_INTERVAL_MS = int(os.getenv("ANOMALY_POLL_INTERVAL_MS", 1000))


class MLWorker:
    def __init__(self):
        self.redis_client: aioredis.Redis = None
        self.buffer = RollingWindowBuffer(window_size_seconds=WINDOW_SIZE_SECONDS)
        self.detector = AnomalyDetector()
        self.last_alert_ts = {}  # Debounce map: (service_id, error_type) -> timestamp
        self._is_running = True

    async def initialize(self):
        logger.info("Connecting ML Worker to Redis (%s:%s)...", REDIS_HOST, REDIS_PORT)
        self.redis_client = aioredis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            decode_responses=True,
            socket_timeout=10.0,
        )

        # Create consumer group if not already present
        try:
            await self.redis_client.xgroup_create(
                name=REDIS_STREAM_KEY,
                groupname=REDIS_CONSUMER_GROUP,
                id="$",
                mkstream=True,
            )
            logger.info("Created Redis consumer group '%s'", REDIS_CONSUMER_GROUP)
        except Exception as e:
            if "BUSYGROUP" in str(e):
                logger.info("Consumer group '%s' already exists.", REDIS_CONSUMER_GROUP)
            else:
                logger.warning("Consumer group setup: %s", str(e))

    async def run(self):
        await self.initialize()
        logger.info("ML Anomaly Detection Worker is active and listening for stream events...")

        while self._is_running:
            try:
                # Read new messages from consumer group
                entries = await self.redis_client.xreadgroup(
                    groupname=REDIS_CONSUMER_GROUP,
                    consumername=CONSUMER_NAME,
                    streams={REDIS_STREAM_KEY: ">"},
                    count=100,
                    block=POLL_INTERVAL_MS,
                )

                if not entries:
                    await asyncio.sleep(0.1)
                    continue

                for stream_name, messages in entries:
                    for msg_id, raw_fields in messages:
                        await self._process_stream_message(msg_id, raw_fields)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in ML consumer worker loop: %s. Retrying in 2s...", e)
                await asyncio.sleep(2)

    async def _process_stream_message(self, msg_id: str, fields: dict):
        service_id = fields.get("service_id", "default-service")
        level = fields.get("level", "INFO").upper()
        error_type = fields.get("error_type")
        stack_trace = fields.get("stack_trace")
        message = fields.get("message")

        # 1. Update rolling window buffer
        self.buffer.add_log(fields)

        # 2. Persist log to PostgreSQL telemetry_logs
        try:
            async with AsyncSessionLocal() as session:
                log_entry = TelemetryLog(
                    service_id=service_id,
                    timestamp=datetime.now(timezone.utc),
                    level=level,
                    latency_ms=float(fields.get("latency_ms", 0.0) or 0.0),
                    error_type=error_type,
                    message=message,
                    stack_trace=stack_trace,
                )
                session.add(log_entry)
                await session.commit()
        except Exception as db_err:
            logger.error("Failed to archive telemetry log to DB: %s", db_err)

        # 3. Evaluate rolling stats for anomaly detection
        stats = self.buffer.get_stats(service_id)
        if stats and stats.sample_count >= 1:
            is_anomaly, score, reason = self.detector.evaluate_features(stats.feature_vector)

            # Direct anomaly trigger if log itself is a critical exception with stack trace
            if level in ("ERROR", "CRITICAL") and stack_trace:
                is_anomaly = True
                score = max(score, 0.90)
                reason = f"Unhandled Exception ({error_type or 'ServerError'})"

            if is_anomaly:
                await self._handle_anomaly(service_id, score, reason, stats, fields)

        # 4. Acknowledge Redis Stream message
        try:
            await self.redis_client.xack(REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP, msg_id)
        except Exception as ack_err:
            logger.error("Failed to XACK message %s: %s", msg_id, ack_err)

    async def _handle_anomaly(
        self,
        service_id: str,
        score: float,
        reason: str,
        stats,
        current_event: dict,
    ):
        error_type = current_event.get("error_type") or stats.latest_error_type or "SystemAnomaly"
        stack_trace = current_event.get("stack_trace") or stats.latest_stack_trace or f"Anomaly: {reason}\nLatency P95: {stats.latency_p95:.1f}ms, Error Ratio: {stats.error_ratio:.2f}"
        message = current_event.get("message") or stats.latest_message or reason

        # Debounce to avoid flooding alerts for the same continuous incident (15s cooldown)
        debounce_key = f"{service_id}:{error_type}"
        last_time = self.last_alert_ts.get(debounce_key, 0)
        if time.time() - last_time < 15:
            return

        self.last_alert_ts[debounce_key] = time.time()
        incident_id = uuid.uuid4()

        logger.warn(
            "🚨 ANOMALY DETECTED: [Service: %s] [Score: %.2f] [Error: %s] [Reason: %s]",
            service_id, score, error_type, reason
        )

        # 1. Create open Incident in Database
        try:
            async with AsyncSessionLocal() as session:
                incident = IncidentReport(
                    id=incident_id,
                    service_id=service_id,
                    anomaly_score=score,
                    status="OPEN",
                    error_type=error_type,
                    raw_stack_trace=stack_trace,
                    ai_root_cause=f"Analyzing incident via RAG Diagnostic Doctor... ({reason})",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(incident)
                await session.commit()
                logger.info("Saved incident report %s to database.", incident_id)
        except Exception as db_err:
            logger.error("Failed to save incident report: %s", db_err)

        # 2. Publish to Redis channel `anomaly_alerts` for RAG Doctor & UI WebSockets
        alert_payload = {
            "incident_id": str(incident_id),
            "service_id": service_id,
            "anomaly_score": score,
            "error_type": error_type,
            "message": message,
            "stack_trace": stack_trace,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            await self.redis_client.publish(
                REDIS_ANOMALY_CHANNEL,
                json.dumps(alert_payload)
            )
            logger.info("Published anomaly alert to channel '%s'", REDIS_ANOMALY_CHANNEL)
        except Exception as pub_err:
            logger.error("Failed to publish anomaly alert: %s", pub_err)


async def main():
    worker = MLWorker()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
