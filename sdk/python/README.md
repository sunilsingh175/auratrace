# AuraTrace Python SDK

Official Python telemetry and unhandled crash diagnostics SDK for AuraTrace.

## Quickstart

```python
from auratrace import AuraTrace

# Initialize AuraTrace Client
aura = AuraTrace(
    service_id="payment-service",
    api_key="aura_payment_secret_456",
    endpoint="http://localhost:8000"
)

# 1. Log metrics & structured messages
aura.info("User checkout initiated", latency_ms=45.2, metadata={"user_id": "usr_99"})

# 2. Capture and report caught exceptions
try:
    process_payment()
except Exception as e:
    aura.capture_exception(e, message="Payment processing failure")

# 3. Use as a FastAPI / Flask middleware
# Automatically records latency and reports unhandled exceptions
app.add_middleware(aura.get_fastapi_middleware())
```
