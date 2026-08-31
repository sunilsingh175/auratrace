import os
import sys
import json
import asyncio
import uuid
import redis.asyncio as aioredis

# Ensure workspace and current dir are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .model import AnomalyDetector
    from .window_buffer import LogBuffer
except (ImportError, ValueError):
    from model import AnomalyDetector
    from window_buffer import LogBuffer

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

logger = get_logger("ml-worker")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_STREAM_KEY = os.getenv("REDIS_STREAM_KEY", "telemetry_stream")
REDIS_ANOMALY_CHANNEL = "anomaly_events"

async def process_stream():
    redis_client = aioredis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)
    detector = AnomalyDetector()
    buffer = LogBuffer()
    last_id = "0"
    
    logger.info("ML Worker actively monitoring stream...")
    
    while True:
        try:
            messages = await redis_client.xread({REDIS_STREAM_KEY: last_id}, count=50, block=2000)
            for stream, entries in messages:
                for message_id, message_data in entries:
                    last_id = message_id
                    payload = json.loads(message_data["payload"])
                    buffer.add_log(payload)
                    
                    features = buffer.extract_features()
                    if payload.get("level") == "ERROR" and detector.predict(features):
                        alert = {
                            "incident_id": str(uuid.uuid4()),
                            "service_id": payload.get("service_id", "unknown-service"),
                            "error_type": "SystemAnomaly",
                            "stack_trace": payload.get("log_message", ""),
                            "reason": "Isolation Forest flagged high error ratio and unusual payload size",
                            "is_diagnosed": False
                        }
                        await redis_client.publish(REDIS_ANOMALY_CHANNEL, json.dumps(alert))
                        logger.warning(f"Anomaly published for {alert['service_id']}")
                        
        except Exception as e:
            logger.error(f"Stream processing error: {e}")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(process_stream())