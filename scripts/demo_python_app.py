"""
AuraTrace Demo Python Application
Demonstrates zero-config auto-discovery, telemetry streaming, and automated exception capture in Python.
"""

import sys
import os
import time

# Ensure sdk/python is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sdk_dir = os.path.join(os.path.dirname(current_dir), "sdk", "python")
if sdk_dir not in sys.path:
    sys.path.insert(0, sdk_dir)

import auratrace

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def _load_env():
    candidates = [
        ".env",
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v

_load_env()

API_KEY = os.getenv("AURATRACE_API_KEY") or os.getenv("AURA_MASTER_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "AURATRACE_API_KEY or AURA_MASTER_API_KEY is required. "
        "Please set it in your environment or in a .env file."
    )

ENDPOINT = os.getenv("AURATRACE_ENDPOINT", "http://127.0.0.1:8000")

print("==================================================")
print("🚀 Starting Demo Python Microservice with AuraTrace")
print("==================================================")

# 1. Initialize AuraTrace with zero-config
client = auratrace.init(
    api_key=API_KEY,
    endpoint=ENDPOINT,
    service_name="order-fulfillment-python",
    version="1.8.0",
    environment="production",
)

print(f"✅ AuraTrace SDK Initialized!")
print(f"   • Service Name: {client.service_name}")
print(f"   • Runtime: {client.runtime}")
print(f"   • Version: {client.version}")
print(f"   • Endpoint: {ENDPOINT}")
print(f"   • Project Key: {API_KEY[:12]}...")

def run_demo():
    print("\n📡 1. Emitting normal operational telemetry...")
    for i in range(1, 4):
        client.capture_message(
            f"Dispatched fulfillment queue batch #{i}",
            metadata={"batch_id": f"batch-{i}", "orders_count": 25, "queue_depth": 3},
        )
        print(f"   ✓ Streamed telemetry event #{i}")
        time.sleep(0.1)

    print("\n💥 2. Simulating critical exception (Redis Cache Connection Refused)...")
    try:
        # Simulate a database / redis connection failure
        raise ConnectionRefusedError(
            "ConnectionRefusedError: [Errno 111] Connection refused while connecting to redis:6379 "
            "for session lock key: 'sess:user:918231'"
        )
    except Exception as exc:
        print("   ⚠️ Intercepted error. Dispatching to AuraTrace AI Doctor...")
        client.capture_exception(
            exc,
            metadata={
                "endpoint": "/api/v1/orders/dispatch",
                "method": "POST",
                "order_id": "ord_8829103",
                "redis_host": "redis:6379",
            },
        )
        print("   ✅ Error telemetry successfully dispatched to ingestion stream!")

    # Flush batch queue
    print("\n⏳ Flushing telemetry buffer...")
    client.flush()
    print("✨ Demo Python run completed successfully!")

if __name__ == "__main__":
    run_demo()
