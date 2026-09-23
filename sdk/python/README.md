# Trace Python SDK

Official Python telemetry and unhandled crash diagnostics SDK for Trace.

## Quickstart

```python
from trace_sdk import Trace, TraceMiddleware

# Initialize Trace Client
trace = Trace(
    service_id="payment-service",
    api_key="trace_payment_secret_456",
    endpoint="http://localhost:8000"
)

# 1. Log metrics & structured messages
trace.info("User checkout initiated", latency_ms=45.2, metadata={"user_id": "usr_99"})

# 2. Capture and report caught exceptions
try:
    process_payment()
except Exception as e:
    trace.capture_exception(e, message="Payment processing failure")

# 3. Use as a FastAPI / Starlette middleware
# Automatically records latency and reports unhandled exceptions
app.add_middleware(TraceMiddleware, client=trace)
```
