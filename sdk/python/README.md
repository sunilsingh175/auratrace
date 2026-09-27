# AuraTrace Python SDK

Zero-config crash capture for Python applications.

## Install

```bash
pip install auratrace-sdk
```

## Quick Start

```python
from auratrace import init

init(api_key="aura_live_...")
```

That's it. Now every uncaught exception is automatically captured
and sent to AuraTrace for AI diagnosis.

## Optional configuration

```python
init(
    api_key="aura_live_...",
    endpoint="http://localhost:8000",   # default
    service_name="payment-service",      # auto-detected if omitted
    environment="production",            # or from AURATRACE_ENV
    auto_capture=True,                   # install excepthook
)
```

## Manual capture

```python
from auratrace import capture_exception, capture_event

try:
    process_payment()
except Exception as e:
    capture_exception(e)

# Custom events
capture_event("latency", latency_ms=3500, endpoint="/api/checkout")
```

## Frameworks supported

- FastAPI (auto-instrumented)
- Flask (auto-instrumented)
- Django (auto-instrumented)
- Plain Python (always)

## Environment variables

| Variable | Description |
|----------|-------------|
| `AURATRACE_API_KEY` | API key (alternative to passing in code) |
| `AURATRACE_ENDPOINT` | Override endpoint |
| `AURATRACE_SERVICE` | Service name |
| `AURATRACE_ENV` | Environment (production/staging/dev) |
| `AURATRACE_DISABLED` | Set to `1` to disable the SDK |
