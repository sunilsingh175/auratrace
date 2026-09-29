# AuraTrace — Autonomous Crash Observability & Self-Healing Platform

AuraTrace is an SDK-first crash observability and autonomous AI self-healing platform. The developer experience is deliberately minimal: install the SDK, import it once at application startup, and run your application normally.

```text
Install AuraTrace SDK
        ↓
Run application
        ↓
AuraTrace detects crash
        ↓
AI diagnoses problem
        ↓
AuraTrace generates repair
        ↓
Repair is tested in sandbox
        ↓
GitHub PR & CI validate it
        ↓
Deployment monitored
        ↓
Rollback if regression
```

The developer never writes manual telemetry calls, configures message brokers, manages vector databases, or triggers the repair engine manually.

---

## 🚀 Quick Start

### 1. Python Application

```bash
pip install auratrace
```

```python
import auratrace

def main():
    # AuraTrace automatically captures uncaught exceptions, extracts stack traces
    # and metadata, and dispatches telemetry asynchronously.
    risky_operation()

if __name__ == "__main__":
    main()
```

### 2. Node.js Application

```bash
npm install @auratrace/node
```

```typescript
import "@auratrace/node";

async function main() {
  // Automatically catches unhandled exceptions & promise rejections,
  // flushes crash telemetry, and exits safely.
  await startService();
}

main();
```

### Configuration
The application only requires a project-scoped API key:
```env
AURATRACE_API_KEY=your_project_api_key
AURATRACE_ENDPOINT=http://localhost:8000
```

---

## ⚡ Autonomous Self-Healing Lifecycle

```text
SDK Crash
   ↓
FastAPI Ingestion Gateway
   ↓
Redis Stream
   ↓
ML Anomaly Detection (Isolation Forest: 8 features)
   ↓
PostgreSQL Incident (Project-Scoped)
   ↓
pgvector RAG (384-dim dense embeddings + Top 3 matches)
   ↓
Gemini Structured Diagnosis & Patch Synthesis
   ↓
Autonomous L3 Repair Engine
   ↓
Safety Gate (Restricted paths & dangerous command inspection)
   ↓
Mandatory Sandbox (Isolated temp workspace + allowlisted test runner)
   ↓
GitHub Repair Branch & Pull Request
   ↓
CI Verification (wait_for_ci)
   ↓
Controlled Merge (Auto-Merge or Manual Review)
   ↓
Post-Deployment Health Monitoring
   ┌─────────┴─────────┐
   ▼                   ▼
Healthy             Regression Detected
                       ↓
                    Automated Rollback PR
```

---

## 📚 Technical Documentation

Comprehensive architectural and engineering documentation is available in the [`docs/`](docs/) directory:

- [System Architecture](docs/architecture.md) — Multi-tenant system design, services, and event pipelines.
- [SDK Integration Guide](docs/sdk.md) — Python & Node.js SDK installation, hooks, and crash exit semantics.
- [Machine Learning Engine](docs/ml.md) — 8-feature Isolation Forest detector vs. offline HDFS benchmark.
- [RAG AI Diagnostics](docs/rag.md) — Dense vector embeddings, pgvector cosine search, and multi-tenant isolation.
- [L3 Automated Repair](docs/l3-repair.md) — Safety Gate rules, mandatory sandbox testing, and rollback guards.
- [Database & Migrations](docs/database.md) — Declarative SQL schema migrations and relational models.
- [Security Architecture](docs/security.md) — Tenant isolation, token encryption, and sandbox isolation.
- [2-Minute Demo Guide](docs/demo.md) — Step-by-step instructions for running the autonomous E2E demo.

---

## 🧪 Running Tests & Validation

```bash
# Python SDK tests
python -m pytest -s sdk/python/test_python_sdk.py

# Node.js SDK tests
cd sdk/nodejs && npm test

# ML production model evaluation (unseen test split)
python scripts/train/evaluate_production.py

# L3 autonomous repair integration tests
python -m pytest -s tests/integration/test_l3_repair.py

# Frontend production build
cd frontend && npm run build
```

---

## 🔒 Security

- **Project Scoping:** All telemetry, incidents, services, WebSocket alerts, and private RAG embeddings are strictly isolated by `project_id`.
- **Credential Protection:** GitHub Personal Access Tokens are encrypted with AES-GCM at rest.
- **Fail-Silent Design:** SDKs never block or crash the host application if the AuraTrace backend is unreachable.
- **Sandbox Security:** Test commands in sandboxes run with `shell=False` and strict entrypoint allowlists.
