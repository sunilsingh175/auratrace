"""
Publishes telemetry events to Redis Streams.
"""
import json
import redis.asyncio as aioredis
from shared.config import get_settings
from shared.sanitizer import sanitize_dict, error_signature

settings = get_settings()
_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get (or lazily create) the shared Redis client."""
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=30,
            socket_connect_timeout=10,
            socket_keepalive=True,
            health_check_interval=15,
            retry_on_timeout=True,
        )
    return _client


async def publish_event(project_id: str, payload: dict) -> str:
    """
    Sanitize the payload and XADD it to the telemetry stream.
    Returns the stream entry ID.
    """
    r = await get_redis()

    # Server-side scrubbing (defense-in-depth)
    sanitized = sanitize_dict(payload)

    # Compute stable signature for dedup
    signature = ""
    if payload.get("error_type") and payload.get("error_message"):
        signature = error_signature(
            payload["error_type"],
            payload["error_message"],
            payload.get("stack_trace", "") or "",
        )
    elif payload.get("error_type") and payload.get("message"):
        signature = error_signature(
            payload["error_type"],
            payload["message"],
            payload.get("stack_trace", "") or "",
        )

    stream_data = {
        "project_id": str(project_id),
        "event_type": str(payload.get("event_type", "error")),
        "service_name": str(payload.get("service_name") or payload.get("service_id") or "unknown"),
        "environment": str(payload.get("environment", "production")),
        "signature": signature,
        "payload": json.dumps(sanitized),
    }

    event_id = await r.xadd(
        settings.REDIS_STREAM_KEY,
        stream_data,
        maxlen=1_000_000,
        approximate=True,
    )
    return event_id


async def push_log_to_stream(payload: dict):
    """Legacy helper for single payload dictionary."""
    project_id = payload.get("project_id", "default")
    return await publish_event(str(project_id), payload)