import os
import sys
import json
import redis.asyncio as aioredis

# Ensure workspace and current dir are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .config import REDIS_HOST, REDIS_PORT, REDIS_STREAM_KEY
except (ImportError, ValueError):
    from config import REDIS_HOST, REDIS_PORT, REDIS_STREAM_KEY

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

logger = get_logger("ingestion-producer")
redis_client = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

async def push_log_to_stream(payload: dict):
    try:
        await redis_client.xadd(REDIS_STREAM_KEY, {"payload": json.dumps(payload)}, maxlen=10000)
    except Exception as e:
        logger.error(f"Failed to push to Redis stream: {e}")