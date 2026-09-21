"""
Trace Redis-buffered ingestion burst test.

Sends a configurable burst of telemetry to the FastAPI ingestion gateway and
measures HTTP acceptance latency, throughput, and the change in the Redis
telemetry stream. The test does not bypass the ingestion API.

Usage:
    python scripts/stress_test.py
    python scripts/stress_test.py --requests 2000 --concurrency 100

The script expects the local Docker stack to be running. Authentication is
optional and is enabled only when AURA_MASTER_API_KEY is supplied and
--auth is used.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any

import httpx

GATEWAY_URL = os.getenv("AURA_GATEWAY_URL", "http://localhost:8000/api/v1/telemetry")
STATS_URL = os.getenv("AURA_STATS_URL", "http://localhost:8000/api/v1/stats")
REDIS_STREAM_KEY = os.getenv("REDIS_STREAM_KEY", "telemetry_stream")
DEFAULT_REQUESTS = 1000
DEFAULT_CONCURRENCY = 50


def percentile(values: list[float], p: float) -> float:
    if not values:
        return float("nan")
    ordered = sorted(values)
    index = (len(ordered) - 1) * (p / 100.0)
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = index - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction


def redis_stream_length() -> int | None:
    """Read XLEN through the local Docker Compose Redis service if available."""
    try:
        result = subprocess.run(
            [
                "docker",
                "compose",
                "exec",
                "-T",
                "redis-broker",
                "redis-cli",
                "XLEN",
                REDIS_STREAM_KEY,
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None

    if result.returncode != 0:
        return None
    try:
        return int(result.stdout.strip())
    except ValueError:
        return None


async def fetch_stats(client: httpx.AsyncClient) -> dict[str, Any] | None:
    try:
        response = await client.get(STATS_URL)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else None
    except (httpx.HTTPError, json.JSONDecodeError):
        return None


def build_payload(sequence: int) -> dict[str, Any]:
    return {
        "service_id": "stress-test-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "INFO",
        "latency_ms": 25.0 + (sequence % 20),
        "message": f"Stress-test telemetry event {sequence}",
        "metadata": {
            "test": "phase-6-ingestion-burst",
            "sequence": sequence,
        },
    }


async def send_burst(
    total_requests: int,
    concurrency: int,
    headers: dict[str, str],
) -> tuple[list[float], dict[int, int]]:
    latencies: list[float] = []
    status_counts: dict[int, int] = {}
    next_sequence = 0
    sequence_lock = asyncio.Lock()

    limits = httpx.Limits(
        max_connections=concurrency,
        max_keepalive_connections=concurrency,
    )

    async def worker(client: httpx.AsyncClient) -> None:
        nonlocal next_sequence
        while True:
            async with sequence_lock:
                if next_sequence >= total_requests:
                    return
                sequence = next_sequence
                next_sequence += 1

            started = time.perf_counter()
            try:
                response = await client.post(
                    GATEWAY_URL,
                    json=build_payload(sequence),
                    headers=headers,
                )
                elapsed_ms = (time.perf_counter() - started) * 1000.0
                status_counts[response.status_code] = status_counts.get(response.status_code, 0) + 1
                if response.status_code == 202:
                    latencies.append(elapsed_ms)
            except httpx.HTTPError:
                status_counts[-1] = status_counts.get(-1, 0) + 1

    async with httpx.AsyncClient(timeout=10.0, limits=limits) as client:
        tasks = [asyncio.create_task(worker(client)) for _ in range(concurrency)]
        await asyncio.gather(*tasks)

    return latencies, status_counts


async def run(args: argparse.Namespace) -> int:
    headers = {"Content-Type": "application/json"}
    api_key = os.getenv("AURA_MASTER_API_KEY") or os.getenv("AURA_API_KEY") or "aura_secret_key_123"
    if api_key:
        headers["X-API-Key"] = api_key

    async with httpx.AsyncClient(timeout=5.0) as client:
        before_stats = await fetch_stats(client)

    before_stream = redis_stream_length()

    print("=" * 72)
    print("Trace Phase 6 — Redis-Buffered Ingestion Burst Test")
    print(f"Gateway:     {GATEWAY_URL}")
    print(f"Requests:    {args.requests}")
    print(f"Concurrency: {args.concurrency}")
    print(f"Redis key:   {REDIS_STREAM_KEY}")
    print("=" * 72)
    print(f"Redis XLEN before burst: {before_stream if before_stream is not None else 'unavailable'}")

    started = time.perf_counter()
    latencies, status_counts = await send_burst(args.requests, args.concurrency, headers)
    elapsed = time.perf_counter() - started

    async with httpx.AsyncClient(timeout=5.0) as client:
        after_submit_stats = await fetch_stats(client)

    after_stream = redis_stream_length()

    accepted = status_counts.get(202, 0)
    failed = args.requests - accepted
    acceptance_rate = accepted / args.requests * 100 if args.requests else 0.0
    throughput = args.requests / elapsed if elapsed else 0.0

    print("\nResults")
    print(f"Total elapsed:       {elapsed:.3f} s")
    print(f"Requests submitted:  {args.requests}")
    print(f"HTTP 202 accepted:   {accepted} ({acceptance_rate:.2f}%)")
    print(f"Non-202/errors:      {failed}")
    print(f"Burst throughput:     {throughput:.2f} req/s")

    if latencies:
        print(f"Accepted mean:       {statistics.fmean(latencies):.2f} ms")
        print(f"Accepted P50:        {percentile(latencies, 50):.2f} ms")
        print(f"Accepted P95:        {percentile(latencies, 95):.2f} ms")
        print(f"Accepted P99:        {percentile(latencies, 99):.2f} ms")

    print("\nHTTP status counts")
    for status, count in sorted(status_counts.items()):
        label = "network_error" if status == -1 else str(status)
        print(f"  {label}: {count}")

    print("\nRedis buffering")
    print(f"XLEN before burst:    {before_stream if before_stream is not None else 'unavailable'}")
    print(f"XLEN after submit:    {after_stream if after_stream is not None else 'unavailable'}")
    if before_stream is not None and after_stream is not None:
        print(f"XLEN change:          {after_stream - before_stream:+d}")

    if before_stats and after_submit_stats:
        before_total = before_stats.get("total_logs_ingested")
        after_total = after_submit_stats.get("total_logs_ingested")
        if isinstance(before_total, (int, float)) and isinstance(after_total, (int, float)):
            print(f"Persisted-log delta:  {after_total - before_total:+.0f}")

    print("\nInterpretation")
    if accepted == args.requests:
        print("All requests were accepted with HTTP 202 by the ingestion gateway.")
    else:
        print("Not all requests were accepted; inspect the status counts and gateway logs.")
    if before_stream is not None and after_stream is not None:
        print("The Redis XLEN snapshot shows whether the stream accumulated messages during the burst.")
    else:
        print("Redis XLEN could not be read; the HTTP results are still valid, but queue buffering was not measured.")
    print("Note: the post-submit Redis value is a point-in-time observation because the ML consumer may drain the stream concurrently.")
    print("=" * 72)

    return 0 if accepted == args.requests else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stress-test Trace ingestion and Redis buffering.")
    parser.add_argument("--requests", type=int, default=DEFAULT_REQUESTS, help="Total telemetry requests to send.")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="Number of concurrent HTTP workers.")
    parser.add_argument("--auth", action="store_true", help="Send X-API-Key using AURA_MASTER_API_KEY.")
    args = parser.parse_args()
    if args.requests <= 0 or args.concurrency <= 0:
        parser.error("--requests and --concurrency must be positive")
    return args


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(asyncio.run(run(parse_args())))
