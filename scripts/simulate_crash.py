"""
AuraTrace Chaos & Anomaly Simulation Script
Injects healthy synthetic operational traffic and triggers real-world cascading microservice crash scenarios.
"""

import sys
import time
import random
import httpx
from datetime import datetime, timezone

GATEWAY_URL = "http://localhost:8000/api/v1/telemetry"
API_KEY = "aura_secret_key_123"

SERVICES = ["payment-service", "auth-service", "default-service", "order-service"]

# Realistic Crash Stack Traces matching knowledge base patterns
SCENARIOS = {
    "1": {
        "name": "Database Connection Pool Exhaustion",
        "service": "payment-service",
        "level": "CRITICAL",
        "error_type": "DatabaseConnectionPoolExhausted",
        "message": "asyncpg.exceptions.TooManyConnectionsError: remaining connection slots are reserved for non-replication superuser connections",
        "stack_trace": """Traceback (most recent call last):
  File "/app/backend/handlers/payment.py", line 42, in process_payment
    conn = await db_pool.acquire()
  File "/usr/local/lib/python3.11/site-packages/asyncpg/pool.py", line 456, in acquire
    raise exceptions.TooManyConnectionsError("remaining connection slots are reserved")
asyncpg.exceptions.TooManyConnectionsError: remaining connection slots are reserved for non-replication superuser connections""",
        "latency_ms": 1420.5,
    },
    "2": {
        "name": "Unhandled Type Error (Undefined Properties)",
        "service": "order-service",
        "level": "ERROR",
        "error_type": "UnhandledTypeError",
        "message": "TypeError: Cannot read properties of undefined (reading 'items')",
        "stack_trace": """TypeError: Cannot read properties of undefined (reading 'items')
    at parsePayload (/app/src/services/telemetry.js:28:18)
    at processLogQueue (/app/src/worker.js:104:12)
    at emit (node:events:517:28)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)""",
        "latency_ms": 312.0,
    },
    "3": {
        "name": "Memory Leak & Heap Exhaustion",
        "service": "auth-service",
        "level": "CRITICAL",
        "error_type": "MemoryLeakOutOfMemory",
        "message": "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
        "stack_trace": """<--- Last few GCs --->
[38:0x55dc120]    89421 ms: Mark-sweep 2045.2 (2052.1) -> 2043.1 (2053.4) MB, 842.1 / 0.0 ms
[38:0x55dc120]    90264 ms: Mark-sweep 2045.8 (2053.4) -> 2045.0 (2054.2) MB, 840.4 / 0.0 ms
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
 1: 0xb73420 node::Abort() [/usr/local/bin/node]
 2: 0x98f23c v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool)""",
        "latency_ms": 2890.0,
    },
    "4": {
        "name": "Distributed Deadlock Detected",
        "service": "payment-service",
        "level": "CRITICAL",
        "error_type": "DeadlockVictimException",
        "message": "asyncpg.exceptions.DeadlockDetectedError: deadlock detected - Process 14022 waits for ShareLock",
        "stack_trace": """asyncpg.exceptions.DeadlockDetectedError: deadlock detected
DETAIL: Process 14022 waits for ShareLock on transaction 8891; Process 14023 waits for ExclusiveLock on transaction 8890.
  File "/app/services/ledger.py", line 87, in transfer_balance
    await conn.execute("UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from_id)""",
        "latency_ms": 980.2,
    },
    "5": {
        "name": "JWT Expired / Clock Drift",
        "service": "auth-service",
        "level": "ERROR",
        "error_type": "JWTSignatureVerificationFailed",
        "message": "jwt.exceptions.ExpiredSignatureError: Signature has expired",
        "stack_trace": """Traceback (most recent call last):
  File "/app/auth/middleware.py", line 55, in authenticate_request
    payload = jwt.decode(token, SECRET, algorithms=["HS256"])
  File "/usr/local/lib/python3.11/site-packages/jwt/api_jwt.py", line 198, in decode
    self._validate_claims(payload, merged_options, **kwargs)
jwt.exceptions.ExpiredSignatureError: Signature has expired""",
        "latency_ms": 65.0,
    },
}


def send_telemetry(payload: dict):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }
    try:
        res = httpx.post(GATEWAY_URL, json=payload, headers=headers, timeout=5.0)
        return res.status_code == 202
    except Exception as e:
        print(f"⚠️ Failed to send log to {GATEWAY_URL}: {e}")
        return False


def stream_healthy_traffic(count: int = 20, delay_sec: float = 0.2):
    print(f"\n🟢 Streaming {count} normal operational logs...")
    for i in range(count):
        service = random.choice(SERVICES)
        latency = round(random.uniform(12.0, 48.0), 2)
        payload = {
            "service_id": service,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "INFO",
            "latency_ms": latency,
            "message": f"Handled GET /api/v1/resource/{random.randint(100, 999)} successfully (200 OK)",
            "metadata": {"endpoint": "/api/v1/resource", "status": 200},
        }
        send_telemetry(payload)
        print(f"  [OK] Sent normal log [{service}] latency={latency}ms")
        time.sleep(delay_sec)


def inject_anomaly(scenario_key: str):
    sc = SCENARIOS.get(scenario_key)
    if not sc:
        print("Invalid scenario choice.")
        return

    print(f"\n🚨 INJECTING CRASH SCENARIO: {sc['name']} on [{sc['service']}]...")

    # First send a few degraded warning logs
    for _ in range(3):
        send_telemetry({
            "service_id": sc["service"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "WARN",
            "latency_ms": sc["latency_ms"] * 0.5,
            "message": f"High response latency detected on {sc['service']}",
        })
        time.sleep(0.1)

    # Trigger the major exception
    crash_event = {
        "service_id": sc["service"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": sc["level"],
        "latency_ms": sc["latency_ms"],
        "error_type": sc["error_type"],
        "message": sc["message"],
        "stack_trace": sc["stack_trace"],
        "metadata": {"scenario": sc["name"], "simulated": True},
    }

    success = send_telemetry(crash_event)
    if success:
        print(f"💥 Crash event dispatched successfully to AuraTrace!")
        print(f"👉 Open Dashboard at http://localhost:3000 to watch ML Anomaly Detection & AI Doctor Diagnosis.")


def main():
    print("=" * 65)
    print(" 🔮 AuraTrace Chaos & Telemetry Simulation Utility")
    print("=" * 65)

    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        print("Running automatic chaos cycle: Normal Traffic -> Crash -> Normal Traffic...")
        stream_healthy_traffic(count=15, delay_sec=0.1)
        inject_anomaly("1")
        stream_healthy_traffic(count=10, delay_sec=0.1)
        inject_anomaly("2")
        print("\n✅ Simulation cycle completed.")
        return

    while True:
        print("\nSelect an action:")
        print("  1. Stream healthy background traffic (20 normal logs)")
        print("  2. Inject DB Connection Pool Exhaustion (Postgres timeout)")
        print("  3. Inject Unhandled TypeError (Missing payload attribute)")
        print("  4. Inject Out of Memory Heap Crash (Memory leak)")
        print("  5. Inject Distributed Transaction Deadlock")
        print("  6. Inject JWT Expired / Skew Exception")
        print("  7. Run automated continuous traffic generator")
        print("  0. Exit")

        choice = input("\nEnter choice [0-7]: ").strip()
        if choice == "0":
            break
        elif choice == "1":
            stream_healthy_traffic(count=25, delay_sec=0.15)
        elif choice in ("2", "3", "4", "5", "6"):
            mapped = {"2": "1", "3": "2", "4": "3", "5": "4", "6": "5"}
            inject_anomaly(mapped[choice])
        elif choice == "7":
            print("\n🔄 Running continuous traffic stream. Press Ctrl+C to stop.")
            try:
                while True:
                    stream_healthy_traffic(count=10, delay_sec=0.2)
                    if random.random() < 0.25:
                        random_sc = random.choice(list(SCENARIOS.keys()))
                        inject_anomaly(random_sc)
                    time.sleep(2)
            except KeyboardInterrupt:
                print("\nStopped.")


if __name__ == "__main__":
    main()
