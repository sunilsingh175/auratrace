"""
Redis-based rate limiting middleware and counters.
Handles HTTP request rate limiting (sliding window) and autonomous merge velocity limits.
"""
import os
import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from shared.config import get_settings

settings = get_settings()
_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get or initialize singleton async Redis client."""
    global _client
    if _client is None:
        _client = await redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=30,
            socket_connect_timeout=10,
            socket_keepalive=True,
            health_check_interval=15,
            retry_on_timeout=True,
        )
    return _client


# ==============================================================================
# HTTP Sliding Window Rate Limit Middleware
# ==============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for rate limiting by API Key or IP."""

    def __init__(self, app, requests_per_minute: int = 3000):
        super().__init__(app)
        self.requests_per_minute = int(os.getenv("RATE_LIMIT_PER_MIN", str(requests_per_minute)))

    async def dispatch(self, request: Request, call_next):
        # Skip rate limit for docs, health probes, and static routes
        if request.url.path in ("/health", "/health/detailed", "/metrics", "/", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        api_key = request.headers.get("x-api-key") or request.headers.get("x-project-key") or ""
        client_ip = request.client.host if request.client else "unknown"
        identifier = api_key[:16] if api_key else client_ip

        try:
            r = await get_redis()
            current_minute = int(time.time() // 60)
            key = f"ratelimit:{identifier}:{current_minute}"
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, 120)

            if count > self.requests_per_minute:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded ({self.requests_per_minute} req/min). Please back off.",
                )
        except HTTPException:
            raise
        except Exception:
            # Fail open on Redis connectivity glitches
            pass

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        return response


# ==============================================================================
# Autonomous Merge Rate Limiters
# ==============================================================================

async def increment_merges(project_id: str) -> int:
    """Increment today's merge counter. Returns new count."""
    r = await get_redis()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"merges:{project_id}:{today}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, 86400 * 2)  # 2-day TTL
    return count


async def get_merges_today(project_id: str) -> int:
    """Retrieve today's merge count for a project."""
    r = await get_redis()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = f"merges:{project_id}:{today}"
    count = await r.get(key)
    return int(count) if count else 0


async def check_ingest_rate(project_id: str, limit_per_min: int = 1000) -> bool:
    """Token bucket for per-project ingestion rate limiting."""
    r = await get_redis()
    key = f"ingest:{project_id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, 120)
    return count <= limit_per_min
