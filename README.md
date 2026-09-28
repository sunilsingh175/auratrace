# AuraTrace

AuraTrace is an SDK-first crash observability and AI diagnostics platform. A developer creates an AuraTrace project, gets a project API key, installs the Python or Node.js SDK, and the SDK automatically captures application crashes and telemetry. AuraTrace detects anomalies, retrieves similar historical fixes with pgvector, generates an AI diagnosis and code patch, and can run the controlled L3 GitHub repair lifecycle.

## Architecture

```text
Developer Application
       │
       │ AuraTrace Python / Node.js SDK
       ▼
FastAPI Ingestion Gateway
       │
       ▼
Redis Stream
       │
       ▼
ML Anomaly Worker ──► PostgreSQL Incident
       │
       ▼
RAG Diagnostic Engine
   ├── Embeddings
   ├── pgvector top-3 historical matches
   └── Gemini AI synthesis
       │
       ├── Root cause
       └── Recommended code patch
       │
       ▼
Next.js Dashboard
       │
       ▼
L3 Repair Engine (opt-in)
   Safety Gate → Sandbox → GitHub Branch → PR → CI
       │
       ├── Human review / optional auto-merge
       ▼
Post-deploy telemetry
       │
       └── Regression → Rollback PR → Healthy state
```

The L3 lifecycle is verified in the controlled `feat/l3-automated-repair` project environment. It should not be interpreted as universal production auto-deployment: deployment behavior depends on the target repository/workflow, and automatic merge is opt-in.

## Developer workflow

1. Create an AuraTrace project in Projects & Setup.
2. Copy the generated project API key.
3. Install the SDK:
   ```bash
   npm install @auratrace/node
   ```
   or:
   ```bash
   pip install auratrace
   ```
4. Initialize the SDK with the project API key.
5. Run the application normally. The SDK automatically discovers application/runtime metadata and captures unhandled crashes.
6. AuraTrace ingests telemetry through Redis and evaluates anomalies.
7. Crash details show the stack trace, AI root cause, historical pgvector matches, and recommended code fix.
8. When L3 repair is enabled, the repair lifecycle is shown inside the crash details page.

## Python SDK

```python
import auratrace

auratrace.init(
    api_key="YOUR_AURATRACE_PROJECT_KEY",
    endpoint="http://localhost:8000",
)

try:
    process_payment()
except Exception as exc:
    auratrace.capture_exception(exc)
```

For environment-based configuration:

```bash
export AURATRACE_API_KEY="YOUR_AURATRACE_PROJECT_KEY"
export AURATRACE_ENDPOINT="http://localhost:8000"
```

The developer SDK does not use an AuraTrace master/admin API key.

## Node.js SDK

```typescript
import { AuraTrace } from "@auratrace/node";

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY!,
  endpoint: "http://localhost:8000",
});
```

## Local development

Copy the environment template and configure local secrets:

```bash
cp .env.example .env
docker compose up -d --build
```

The local interfaces are:

- Dashboard: `http://localhost:3000`
- FastAPI/OpenAPI: `http://localhost:8000/docs`
- PostgreSQL/pgvector: `localhost:5432`
- Redis: `localhost:6379`

Never commit real API keys, GitHub tokens, encryption keys, database passwords, certificates, or private keys.

## Repository structure

```text
auratrace/
├── .github/workflows/ci.yml
├── backend/
│   ├── ingestion_service/
│   ├── ml_anomaly_service/
│   ├── rag-diagnostic-service/
│   ├── repair_engine/
│   └── shared/
├── database/
│   ├── 01-init.sql
│   ├── 02-seed.sql
│   ├── 03-service-ownership.sql
│   └── 04-l3-repair.sql
├── frontend/
├── sdk/
│   ├── nodejs/
│   └── python/
└── scripts/
```

The internal `services` database entity is used for telemetry/application identity. Developers do not manually register or manage services.

## Testing

Run the repository test suite:

```bash
pytest -q
```

Compile Python sources:

```bash
python -m compileall -q backend sdk/python scripts
```

Build and test the Node.js SDK:

```bash
cd sdk/nodejs
npm ci
npm run build
npm test
```

Check and build the frontend:

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run build
```

The GitHub Actions workflow performs these validation categories automatically.

## L3 repair lifecycle

L3 is the GitHub-based automated repair path:

```text
Crash
  ↓
AI/RAG diagnosis
  ↓
Safety Gate
  ↓
Sandbox tests
  ↓
Repair branch
  ↓
Pull Request
  ↓
GitHub Actions CI
  ↓
Safety/review gate
  ↓
Optional merge
  ↓
Post-deploy telemetry
  ↓
Regression detected?
  ├─ No → Healthy
  └─ Yes → Rollback PR → Rollback merge → Healthy
```

L3 records repair state, CI status, merge status, post-deploy health, and rollback state for display in Crash Details.

The current sandbox provides prototype test isolation and command allowlisting. It is not equivalent to a production-grade container/VM security boundary.

## Security

- Project API keys are scoped to the developer project.
- Developer SDKs must use project API keys, not master/admin credentials.
- L3 repair operations are project-scoped and authorization protected.
- Sensitive files and dangerous patch patterns are rejected by the Safety Gate.
- Sandbox test commands are allowlisted and executed without shell interpretation.
- GitHub credentials must be stored securely and should use least-privilege access.
- Automatic merge remains disabled unless explicitly enabled.

## Scope

AuraTrace currently demonstrates the complete crash-to-diagnosis flow and the L3 repair/rollback lifecycle in a controlled project environment. It does not claim universal autonomous production deployment or production-grade sandbox isolation.

## Maintainer

GitHub: https://github.com/sunilsingh175/auratrace
