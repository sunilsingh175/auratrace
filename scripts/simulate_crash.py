"""
AuraTrace — Crash burst simulator.
Sends N crashes at configurable rate to trigger ML anomaly detection.

Usage:
    python scripts/simulate_crash.py --count 20 --rate 2
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

API = os.getenv("AURATRACE_API", "http://localhost:8000")
API_KEY = os.getenv("AURATRACE_API_KEY", "aura_live_master_auratrace_2026")


CRASH_TEMPLATES = [
    {
        "error_type": "TypeError",
        "error_message": "Cannot read property 'amount' of undefined",
        "stack_trace": "at processPayment (src/payment.js:42)\n  at checkout (src/routes/checkout.js:18)",
        "latency_ms": 3500,
    },
    {
        "error_type": "NullPointerException",
        "error_message": "User object was null when accessing profile",
        "stack_trace": "at UserService.getProfile (services/UserService.java:88)",
        "latency_ms": 1200,
    },
    {
        "error_type": "ConnectionTimeoutError",
        "error_message": "Database connection timed out after 30000ms",
        "stack_trace": "at Pool.connect (node_modules/pg-pool/index.js:412)",
        "latency_ms": 30100,
    },
    {
        "error_type": "ValidationError",
        "error_message": "Invalid email format in request body",
        "stack_trace": "at validateEmail (src/validators/email.js:15)",
        "latency_ms": 45,
    },
    {
        "error_type": "OutOfMemoryError",
        "error_message": "Heap space exhausted during bulk processing",
        "stack_trace": "at BulkProcessor.process (src/bulk.js:210)",
        "latency_ms": 800,
    },
]

SERVICES = ["payment-service", "user-service", "checkout-service", "notification-service"]


def send_crash(template: dict, service: str) -> dict:
    payload = {
        "event_type": "crash",
        "service_name": service,
        "environment": "production",
        "error_type": template["error_type"],
        "error_message": template["error_message"],
        "stack_trace": template["stack_trace"],
        "latency_ms": template["latency_ms"],
        "runtime": {
            "language": random.choice(["nodejs", "python"]),
            "version": "20.10.0",
            "framework": random.choice(["express", "fastapi"]),
        },
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/v1/ingest", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-API-Key", API_KEY)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:200]}"}
    except Exception as e:
        return {"error": str(e)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20, help="Number of crashes")
    parser.add_argument("--rate", type=float, default=2.0, help="Crashes per second")
    args = parser.parse_args()

    if not API_KEY:
        print("⚠️  Set AURATRACE_API_KEY env var")
        sys.exit(1)

    print(f"🚨 Sending {args.count} crashes at {args.rate}/sec to {API}")
    print("=" * 60)

    interval = 1.0 / max(args.rate, 0.1)
    ok_count = 0
    err_count = 0

    for i in range(args.count):
        template = random.choice(CRASH_TEMPLATES)
        service = random.choice(SERVICES)
        result = send_crash(template, service)

        if "error" in result:
            err_count += 1
            print(f"  [{i+1:3d}] ❌ {result['error'][:80]}")
        else:
            ok_count += 1
            print(f"  [{i+1:3d}] ✅ {template['error_type']:<24} @ {service}")

        time.sleep(interval)

    print("=" * 60)
    print(f"✅ Sent: {ok_count}")
    print(f"❌ Failed: {err_count}")
    print()
    print("Wait 60s, then check:")
    print("  • Dashboard: http://localhost:3000")
    print("  • DB:        docker exec trace-postgres psql -U postgres -d auratrace_db -c 'SELECT COUNT(*) FROM incidents;'")


if __name__ == "__main__":
    main()