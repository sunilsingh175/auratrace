# AuraTrace

AuraTrace is an SDK-first crash observability and AI diagnostics platform. The target developer experience is deliberately minimal: install the SDK, import it once at application startup, and run the application normally.

```text
Install SDK
   ↓
Import SDK once
   ↓
Run application normally
   ↓
Crash
   ↓
Automatic capture
   ↓
AuraTrace anomaly detection
   ↓
RAG historical diagnosis
   ↓
AI root cause + patch
   ↓
Controlled L3 repair
   ↓
Validation / CI
   ↓
Post-deploy monitoring
   ↓
Healthy or rollback
```

The developer does not write telemetry calls, register services, configure Redis/PostgreSQL/pgvector/ML/RAG, create incidents, or operate the repair pipeline.

## SDK installation

Python:

```bash
pip install auratrace
```

Application startup:

```python
import auratrace
```

Node.js:

```bash
npm install @auratrace/node
```

Application startup:

```typescript
import "@auratrace/node";
```

The imports install the automatic crash handlers. Explicit initialization and manual capture APIs remain available but are optional.

The SDK still needs a project-scoped AuraTrace API key through `AURATRACE_API_KEY` and optionally `AURATRACE_ENDPOINT`. This is the application-side bootstrap credential; the SDK never requires Redis, PostgreSQL, pgvector, ML, RAG, Gemini, GitHub repair settings, or service registration.

## Architecture

```text
Developer Application
       ↓
AuraTrace SDK
       ↓
FastAPI Ingestion Gateway
       ↓
Redis Stream
       ↓
ML Anomaly Worker
       ↓
Incident
       ↓
Embedding + pgvector top-3 historical fixes
       ↓
RAG + Gemini diagnosis
       ↓
L3 Safety Gate
       ↓
Sandbox
       ↓
GitHub repair branch / PR
       ↓
CI
       ↓
Controlled merge
       ↓
Post-deploy monitoring
       ↓
Healthy OR rollback
```

L3 is a controlled automated repair path. Automatic merge is opt-in, and the current sandbox is prototype-level rather than a production-grade VM/container isolation boundary.

## Security

- SDK credentials are project-scoped.
- No master/admin API key is used by developer applications.
- Telemetry dispatch is asynchronous and fail-silent.
- L3 repair is project-scoped and safety-gated.
- Automatic merge remains disabled unless explicitly enabled.
- GitHub credentials must be stored securely with least privilege.

## Scope

AuraTrace demonstrates automatic crash capture, anomaly detection, historical RAG diagnosis, AI-generated repair guidance, and the controlled L3 repair/rollback lifecycle. It does not claim universal autonomous production deployment.
