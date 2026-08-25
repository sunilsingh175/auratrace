"""
AuraTrace High-Concurrency Ingestion Gateway Benchmark
Evaluates req/sec throughput and latency percentiles under concurrent load.
"""

import time
import asyncio
import numpy as np
import httpx
from datetime import datetime, timezone

GATEWAY_URL = "http://localhost:8000/api/v1/telemetry"
API_KEY = "aura_secret_key_123"
TOTAL_REQUESTS = 500
CONCURRENCY = 25


async def worker(worker_id: int, request_count: int, latencies: list, client: httpx.AsyncClient):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }
    for i in range(request_count):
        payload = {
            "service_id": "benchmark-service",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO",
            "latency_ms": round(np.random.uniform(5.0, 35.0), 2),
            "message": f"Benchmark transaction {worker_id}-{i}",
            "metadata": {"worker_id": worker_id, "req_num": i},
        }

        t0 = time.perf_counter()
        try:
            res = await client.post(GATEWAY_URL, json=payload, headers=headers)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            if res.status_code == 202:
                latencies.append(elapsed_ms)
        except Exception:
            pass


async def run_benchmark():
    print("=" * 65)
    print(" 🚀 AuraTrace Ingestion Throughput & Latency Benchmark")
    print(f" Target: {GATEWAY_URL}")
    print(f" Total Requests: {TOTAL_REQUESTS} | Concurrency: {CONCURRENCY} workers")
    print("=" * 65)

    latencies = []
    per_worker = TOTAL_REQUESTS // CONCURRENCY

    limits = httpx.Limits(max_keepalive_connections=CONCURRENCY, max_connections=CONCURRENCY * 2)
    async with httpx.AsyncClient(timeout=10.0, limits=limits) as client:
        start_time = time.perf_counter()

        tasks = [
            worker(i, per_worker, latencies, client)
            for i in range(CONCURRENCY)
        ]
        await asyncio.gather(*tasks)

        total_time = time.perf_counter() - start_time

    successful = len(latencies)
    if successful == 0:
        print("\n❌ Benchmark failed: Could not connect to Ingestion Gateway at http://localhost:8000")
        print("Please verify the service is running (`docker compose up -d`).")
        return

    lat_arr = np.array(latencies)
    throughput = successful / total_time
    avg_latency = float(np.mean(lat_arr))
    p50 = float(np.percentile(lat_arr, 50))
    p95 = float(np.percentile(lat_arr, 95))
    p99 = float(np.percentile(lat_arr, 99))

    print("\n📊 Benchmark Results:")
    print(f"  • Total Time Elapsed: {total_time:.2f} seconds")
    print(f"  • Successful Requests: {successful}/{TOTAL_REQUESTS} ({(successful/TOTAL_REQUESTS)*100:.1f}%)")
    print(f"  • Throughput Rate:     {throughput:.1f} req/sec")
    print(f"  • Mean Latency:        {avg_latency:.2f} ms")
    print(f"  • P50 Latency:         {p50:.2f} ms")
    print(f"  • P95 Latency:         {p95:.2f} ms")
    print(f"  • P99 Latency:         {p99:.2f} ms")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_benchmark())
