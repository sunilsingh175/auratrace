# AuraTrace SDK Integration Guide

AuraTrace SDKs provide zero-boilerplate, automatic crash interception and telemetry forwarding for Python and Node.js applications.

---

## 1. Python SDK (`auratrace`)

### 1.1 Installation

```bash
pip install auratrace
```

### 1.2 Zero-Config Startup

Add a single import at the entry point of your Python application:

```python
import auratrace

# Your application code begins here
def main():
    # If an uncaught exception occurs, AuraTrace automatically intercepts it,
    # extracts stack trace & runtime metadata, sends telemetry asynchronously,
    # and lets the exception propagate naturally.
    raise ValueError("Database connection timeout")

if __name__ == "__main__":
    main()
```

### 1.3 Configuration Options

The Python SDK reads environment variables automatically:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `AURATRACE_API_KEY` | Project API key obtained from AuraTrace dashboard | *Required* |
| `AURATRACE_ENDPOINT` | Ingestion API URL | `http://localhost:8000` |
| `AURATRACE_SERVICE_ID` | Identifier of this microservice / process | Inferred from app file |
| `AURATRACE_ENVIRONMENT` | Deployment environment (`production`, `staging`, `dev`) | `production` |

### 1.4 Manual Capture (Optional)

```python
import auratrace

try:
    risky_operation()
except Exception as exc:
    auratrace.capture_exception(exc, level="ERROR", custom_metadata={"user_id": "12345"})
```

---

## 2. Node.js SDK (`@auratrace/node`)

### 2.1 Installation

```bash
npm install @auratrace/node
```

### 2.2 Zero-Config Startup

Import the package once at the root of your application (`index.ts` or `app.js`):

```typescript
import "@auratrace/node";

// Your application starts normally
async function startServer() {
  // If an uncaught exception occurs, AuraTrace captures and flushes telemetry,
  // then cleanly exits the process (process.exit(1)) to prevent state corruption.
  throw new Error("Unhandled rejection: Redis connection pool exhausted");
}

startServer();
```

### 2.3 Configuration Options

| Variable | Description | Default |
| :--- | :--- | :--- |
| `AURATRACE_API_KEY` | Project API key | *Required* |
| `AURATRACE_ENDPOINT` | Ingestion API URL | `http://localhost:8000` |
| `AURATRACE_SERVICE_ID` | Service Name / App identifier | `package.json:name` |
| `AURATRACE_ENVIRONMENT`| Runtime environment | `process.env.NODE_ENV` |

---

## 3. Crash Exit Semantics & Reliability

- **Fail-Silent Design:** If the AuraTrace ingestion backend is unreachable, the SDK drops telemetry silently without crashing or blocking user traffic.
- **Node.js Process Crash Preservation:** After capturing an `uncaughtException`, the Node.js SDK flushes the crash event over HTTP within a tight timeout (2000ms) and executes `process.exit(1)`, preserving standard UNIX process crash semantics.
- **Asynchronous Transport:** Uses non-blocking background HTTP workers and batch queues to ensure zero latency overhead on normal application execution paths.
