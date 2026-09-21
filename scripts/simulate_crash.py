"""
Autonomous Crash & Anomaly Simulation Script
Streams real or synthetic microservice telemetry events and injects simulated crashes
to test the ML anomaly pipeline, Redis stream buffering, and WebSocket notifications.
"""

import os
import sys
import time
import random
import requests
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "HDFS_v1", "HDFS.log")
INGESTION_URL = os.getenv("INGESTION_URL", "http://127.0.0.1:8000/api/v1/telemetry")
API_KEY = os.getenv("AURA_MASTER_API_KEY", "")

SERVICES = [
    "payment-service",
    "auth-service",
    "order-service",
    "inventory-service",
    "gateway-service",
]

CRASH_SCENARIOS = [
    {
        "service_id": "payment-service",
        "error_type": "ConnectionPoolTimeout",
        "message": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out",
        "stack_trace": (
            "Traceback (most recent call last):\n"
            '  File "/app/services/payment.py", line 142, in process_charge\n'
            "    db = engine.connect()\n"
            "sqlalchemy.exc.TimeoutError: QueuePool limit exceeded"
        ),
        "status_code": 503,
        "latency_ms": 4200.0,
    },
    {
        "service_id": "auth-service",
        "error_type": "RedisConnectionRefused",
        "message": "redis.exceptions.ConnectionError: Error 111 connecting to redis-broker:6379. Connection refused.",
        "stack_trace": (
            "Traceback (most recent call last):\n"
            '  File "/app/services/session.py", line 88, in get_session\n'
            "    user_data = redis_client.get(session_token)\n"
            "redis.exceptions.ConnectionError: Connection refused"
        ),
        "status_code": 502,
        "latency_ms": 3100.0,
    },
    {
        "service_id": "order-service",
        "error_type": "OutOfMemoryError",
        "message": "java.lang.OutOfMemoryError: Java heap space during batch checkout aggregation",
        "stack_trace": (
            "Exception in thread 'http-nio-8080-exec-4' java.lang.OutOfMemoryError: Java heap space\n"
            "\tat com.auratrace.orders.BatchProcessor.process(BatchProcessor.java:94)\n"
            "\tat com.auratrace.orders.CheckoutController.checkout(CheckoutController.java:42)"
        ),
        "status_code": 500,
        "latency_ms": 5000.0,
    },
]


def generate_synthetic_telemetry(idx: int):
    # Crash anomaly burst between iterations 30-40 and 80-90
    is_anomaly = (30 <= idx <= 40) or (80 <= idx <= 90)

    if is_anomaly:
        scenario = random.choice(CRASH_SCENARIOS)
        return {
            "service_id": scenario["service_id"],
            "message": scenario["message"],
            "error_type": scenario["error_type"],
            "raw_stack_trace": scenario["stack_trace"],
            "latency_ms": scenario["latency_ms"] + random.uniform(-200, 500),
            "status_code": scenario["status_code"],
            "level": "ERROR",
            "metadata": {"synthetic": True, "line_idx": idx, "scenario": scenario["error_type"]},
        }, True

    service = random.choice(SERVICES)
    latency_ms = random.uniform(25.0, 180.0)
    return {
        "service_id": service,
        "message": f"Processed request successfully on {service} route /api/v1/resource",
        "error_type": None,
        "raw_stack_trace": None,
        "latency_ms": round(latency_ms, 2),
        "status_code": 200,
        "level": "INFO",
        "metadata": {"synthetic": True, "line_idx": idx},
    }, False


def stream_logs(max_lines=150):
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["X-API-Key"] = API_KEY

    use_file = os.path.exists(DATASET_PATH)
    print(f"[*] Starting Automatic Backend Detection telemetry stream to {INGESTION_URL}")
    print(f"[*] Mode: {'Dataset File (' + DATASET_PATH + ')' if use_file else 'Standalone Synthetic Generator'}")

    for idx in range(max_lines):
        payload, is_error = generate_synthetic_telemetry(idx)

        try:
            res = requests.post(
                INGESTION_URL,
                json=payload,
                headers=headers,
                timeout=5,
            )

            if res.status_code not in (200, 202):
                print(f"[!] API returned status {res.status_code}: {res.text[:120]}")
                time.sleep(1)
                continue

            if is_error:
                print(
                    f"🚨 [ANOMALY #{idx}] {payload['service_id']} | "
                    f"{payload['status_code']} | {payload['latency_ms']:.0f}ms | {payload['error_type']}"
                )
            elif idx % 10 == 0:
                print(f"✓ [NORMAL #{idx}] {payload['service_id']} | {payload['status_code']} | {payload['latency_ms']:.0f}ms")

            time.sleep(0.08)

        except requests.exceptions.ConnectionError:
            print("[!] Ingestion API offline. Retrying in 2s...")
            time.sleep(2)
        except requests.exceptions.RequestException as exc:
            print(f"[!] Request failed: {exc}")

    print(f"[+] Finished streaming {max_lines} telemetry events.")


if __name__ == "__main__":
    stream_logs()