# AuraTrace Python SDK

Official Python telemetry and crash diagnostics SDK for AuraTrace.

## Quickstart

Install the SDK from the Python SDK directory:

```bash
pip install -e sdk/python
```

Initialize AuraTrace with your project API key:

```python
import auratrace

auratrace.init(api_key="YOUR_AURATRACE_PROJECT_KEY")
```

AuraTrace automatically detects the application name from the running Python application and captures unhandled crashes. Telemetry is sent to the AuraTrace ingestion gateway in the background so the SDK does not block the application.

## Manual exception capture

```python
try:
    process_payment()
except Exception as exc:
    auratrace.capture_exception(exc, message="Payment processing failure")
```

## Custom telemetry

```python
auratrace.capture_message(
    "User checkout initiated",
    level="INFO",
    latency_ms=45.2,
)
```

## Configuration

The project API key can be supplied directly or through:

```bash
export AURATRACE_API_KEY="YOUR_AURATRACE_PROJECT_KEY"
```

For local development, the ingestion endpoint defaults to:

```text
http://localhost:8000
```

Set `AURATRACE_ENDPOINT` when the AuraTrace backend is hosted elsewhere.

Do not place production API keys in source control. Never use an AuraTrace master/admin key in a developer application.

## Automatic crash capture

When initialized with the default global exception hook, AuraTrace captures unhandled Python exceptions, sanitizes stack-trace paths, and queues the telemetry for background delivery.

The SDK is designed to fail silently if telemetry delivery is unavailable so an observability failure does not interrupt the host application.
