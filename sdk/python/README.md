# AuraTrace Python SDK

AuraTrace is an automatic crash-capture client.

## Installation

```bash
pip install auratrace
```

Import the package once at application startup:

```python
import auratrace
```

That is the complete integration for unhandled crashes. Importing AuraTrace automatically installs the global exception hook, detects the application name, captures the crash stack trace and runtime metadata, and sends the event asynchronously.

Use a project-scoped `AURATRACE_API_KEY` and optionally `AURATRACE_ENDPOINT`. The SDK never uses an AuraTrace master/admin key.

## Optional explicit configuration

```python
import auratrace

auratrace.init(
    api_key="YOUR_AURATRACE_PROJECT_KEY",
    endpoint="http://localhost:8000",
)
```

## Optional manual capture

Manual capture remains available for caught exceptions and custom telemetry, but it is not required for unhandled crash detection.

The SDK buffers telemetry in a background worker and fails silently if AuraTrace is unavailable so observability cannot interrupt the host application.
