import os
import time
from auratrace import init, capture_exception, capture_event

api_key = os.getenv("AURATRACE_API_KEY", "aura_live_master_auratrace_2026")

client = init(
    api_key=api_key,
    endpoint="http://localhost:8000",
    service_name="sdk-test-python",
    environment="development",
)

print(f"Python SDK initialized with endpoint: {client.endpoint}")

try:
    data = {"user": None}
    # Intentional crash: NoneType has no attribute 'name'
    result = data["user"]["name"]
except Exception as e:
    capture_exception(e, extra_context={"route": "/api/users/profile", "attempt": 1})
    print("Crash captured and enqueued successfully!")

# Send custom metric event
capture_event("latency", latency_ms=420.5, endpoint="/api/checkout")

print("Waiting for flusher...")
time.sleep(3.5)
client.flush()
print("Python SDK test finished.")
