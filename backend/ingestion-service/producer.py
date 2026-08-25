"""
AuraTrace Redis Stream Producer & Pub/Sub Hub
Buffers telemetry into Redis Stream and routes events to live WebSockets.
"""

import json
import asyncio
from typing import List, Set, Dict, Any, Optional
import redis.asyncio as aioredis
from fastapi import WebSocket

try:
    from .config import settings
    from .schemas import TelemetryItem
except ImportError:
    from config import settings
    from schemas import TelemetryItem
from backend.shared.logger import get_logger

logger = get_logger("ingestion-producer")


class RedisStreamProducer:
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.active_websockets: Set[WebSocket] = set()
        self._pubsub_task: Optional[asyncio.Task] = None
        self._is_running = False

    async def connect(self):
        """Initializes async Redis connection pool and starts pub/sub listener."""
        try:
            self.redis_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                health_check_interval=30,
            )
            await self.redis_client.ping()
            self._is_running = True
            logger.info("Connected successfully to Redis broker at %s:%s", settings.REDIS_HOST, settings.REDIS_PORT)

            # Start background subscriber for anomaly alerts
            self._pubsub_task = asyncio.create_task(self._listen_to_anomaly_alerts())
        except Exception as e:
            logger.error("Failed to connect to Redis: %s", str(e), exc_info=True)
            self.redis_client = None

    async def close(self):
        """Closes Redis connections and cleans up background listener."""
        self._is_running = False
        if self._pubsub_task:
            self._pubsub_task.cancel()
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Closed Redis connection pool.")

    async def produce_event(self, item: TelemetryItem):
        """Buffers a single telemetry item into the Redis Stream (XADD)."""
        payload = {
            "service_id": item.service_id,
            "timestamp": item.timestamp.isoformat() if item.timestamp else "",
            "level": item.level.upper(),
            "latency_ms": str(item.latency_ms),
            "error_type": item.error_type or "",
            "message": item.message or "",
            "stack_trace": item.stack_trace or "",
            "metadata": json.dumps(item.metadata or {}),
        }

        # 1. Publish to Redis Stream for ML Anomaly worker & Archival
        if self.redis_client:
            try:
                await self.redis_client.xadd(
                    name=settings.REDIS_STREAM_KEY,
                    fields=payload,
                    maxlen=settings.REDIS_MAX_STREAM_LEN,
                    approximate=True,
                )
            except Exception as e:
                logger.error("Redis XADD failed: %s", str(e))

        # 2. Broadcast immediately to all connected Live Dashboard WebSockets
        await self.broadcast_websocket({
            "type": "TELEMETRY_LOG",
            "data": {
                "service_id": item.service_id,
                "timestamp": item.timestamp.isoformat() if item.timestamp else "",
                "level": item.level.upper(),
                "latency_ms": item.latency_ms,
                "error_type": item.error_type,
                "message": item.message,
                "stack_trace": item.stack_trace,
                "metadata": item.metadata or {},
            }
        })

    async def produce_batch(self, items: List[TelemetryItem]):
        """Pipelined batch write to Redis Stream."""
        if not items:
            return

        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline(transaction=False)
                for item in items:
                    payload = {
                        "service_id": item.service_id,
                        "timestamp": item.timestamp.isoformat() if item.timestamp else "",
                        "level": item.level.upper(),
                        "latency_ms": str(item.latency_ms),
                        "error_type": item.error_type or "",
                        "message": item.message or "",
                        "stack_trace": item.stack_trace or "",
                        "metadata": json.dumps(item.metadata or {}),
                    }
                    pipe.xadd(
                        name=settings.REDIS_STREAM_KEY,
                        fields=payload,
                        maxlen=settings.REDIS_MAX_STREAM_LEN,
                        approximate=True,
                    )
                await pipe.execute()
            except Exception as e:
                logger.error("Batch Redis XADD failed: %s", str(e))

        # Broadcast the last few logs or sample to WebSockets to avoid overwhelming clients
        sample_logs = items[-10:]
        for item in sample_logs:
            await self.broadcast_websocket({
                "type": "TELEMETRY_LOG",
                "data": {
                    "service_id": item.service_id,
                    "timestamp": item.timestamp.isoformat() if item.timestamp else "",
                    "level": item.level.upper(),
                    "latency_ms": item.latency_ms,
                    "error_type": item.error_type,
                    "message": item.message,
                    "stack_trace": item.stack_trace,
                }
            })

    # ==========================================================================
    # Live WebSocket Connection Manager
    # ==========================================================================
    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)
        logger.info("WebSocket client connected. Total active: %d", len(self.active_websockets))

    def unregister_websocket(self, websocket: WebSocket):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)
            logger.info("WebSocket client disconnected. Total active: %d", len(self.active_websockets))

    async def broadcast_websocket(self, message: Dict[str, Any]):
        """Dispatches an event to all connected dashboard WebSockets."""
        if not self.active_websockets:
            return

        dead_connections = set()
        msg_str = json.dumps(message)
        for ws in self.active_websockets:
            try:
                await ws.send_text(msg_str)
            except Exception:
                dead_connections.add(ws)

        for dead in dead_connections:
            self.unregister_websocket(dead)

    async def _listen_to_anomaly_alerts(self):
        """Background task subscribing to Redis channel `anomaly_alerts`."""
        while self._is_running:
            try:
                if not self.redis_client:
                    await asyncio.sleep(2)
                    continue

                pubsub = self.redis_client.pubsub()
                await pubsub.subscribe(settings.REDIS_ANOMALY_CHANNEL)
                logger.info("Subscribed to Redis channel: %s", settings.REDIS_ANOMALY_CHANNEL)

                async for raw_msg in pubsub.listen():
                    if not self._is_running:
                        break
                    if raw_msg and raw_msg["type"] == "message":
                        try:
                            parsed_data = json.loads(raw_msg["data"])
                            logger.warn("Received anomaly alert from broker: %s", parsed_data.get("error_type"))
                            await self.broadcast_websocket({
                                "type": "ANOMALY_ALERT",
                                "data": parsed_data
                            })
                        except Exception as parse_err:
                            logger.error("Failed to parse pub/sub message: %s", parse_err)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in anomaly subscriber loop: %s. Reconnecting in 3s...", e)
                await asyncio.sleep(3)


# Global Producer Instance
producer = RedisStreamProducer()
