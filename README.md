# AuraTrace: AI-Powered Application Observability & Crash Diagnostics Platform

AuraTrace is a modern, event-driven observability and automated root-cause analysis platform. It ingests continuous telemetry streams, detects system anomalies using unsupervised machine learning (Isolation Forest), performs semantic incident matching using `pgvector`, and generates actionable diagnostic and recovery patches using Retrieval-Augmented Generation (RAG) with Google Gemini.

---

## Architecture Overview

```text
Python SDK ──┐
             ├──► [ FastAPI Gateway ] ──► [ Redis Stream Buffer ]
Node.js SDK ─┘             │                       │
                           ▼                       ▼
                   [ WebSocket Pub/Sub ]   [ ML Anomaly Worker ]
                           │               (Isolation Forest)
                           │                       │
                           │                       ▼
                           │             [ PostgreSQL Incident ]
                           │                       │
                           │                       ▼
                           │               [ RAG AI Doctor ]
                           │               ├── pgvector Semantic Search
                           │               └── Gemini Diagnosis & Patch
                           │                       │
                           ▼                       ▼
                   [ Next.js Real-Time Observability Dashboard ]
```

### End-to-End Workflow

1. **SDK-First Zero-Configuration Auto-Discovery**: Applications integrate via the AuraTrace Python or Node.js SDK using a project API key (`at_live_...`). Service metadata, environment, runtime, and version are automatically discovered upon first telemetry emission.
2. **High-Throughput Redis Stream Ingestion**: The FastAPI gateway accepts telemetry events with sub-millisecond asynchronous handoff to Redis Streams (`XADD`) and immediately returns HTTP 202.
3. **Unsupervised ML Anomaly Detection**: A dedicated worker consumes the telemetry stream in real time, calculating rolling 5-minute statistical windows (error rate, 5xx ratio, latency distributions, unique errors) evaluated by an Isolation Forest model.
4. **pgvector Historical Knowledge Retrieval**: When an incident is flagged, its error pattern and stack trace are vectorized using semantic embeddings (`sentence-transformers`) and queried against verified historical fixes.
5. **RAG AI Doctor (Gemini)**: The incident context and top pgvector semantic matches are synthesized and passed to Gemini to generate root-cause explanations and concrete recovery patches.
6. **Live WebSocket Telemetry & Dashboard**: Telemetry logs and newly diagnosed incidents are broadcast in real time to the Next.js frontend.

---

## Key Features

* **Zero-Config SDKs**: Native Python (`auratrace`) and Node.js (`@auratrace/node`) client libraries with automatic unhandled exception interceptors and background queue flushing.
* **Non-Blocking Telemetry Ingestion**: Redis-buffered queue decouples client logging from long-term database persistence.
* **Unsupervised Anomaly Scoring**: Real-time sliding window telemetry evaluation using Isolation Forest with heuristic fallback scoring.
* **Contextual RAG Diagnostics**: Semantic vector search on PostgreSQL (`pgvector`) combined with Gemini LLM for automated post-mortem insights and remediation steps.
* **Role-Based Access Control**: Secure user authentication (Admin, Developer) with JWT sessions, API key hashing, and optional email OTP delivery.
* **Production-Ready Dashboard**: Next.js 14 App Router UI with real-time incident timelines, live telemetry feeds, project management, and system metrics.

---

## Repository Structure

```text
auratrace/
├── docker-compose.yml               # Multi-container orchestration
├── .env.example                     # Environment configuration template
├── README.md                        # Documentation & setup guide
├── pytest.ini                       # Test configuration
├── database/                        # PostgreSQL + pgvector initialization
│   ├── 01-init.sql                  # Schema & table definitions
│   ├── 02-seed.sql                  # Historical knowledge base & seed data
│   └── 03-service-ownership.sql     # Service mappings
├── backend/
│   ├── ingestion_service/           # FastAPI gateway & WebSocket broadcaster
│   ├── ml_anomaly_service/          # Isolation Forest anomaly worker
│   ├── rag-diagnostic-service/      # pgvector RAG & Gemini AI Doctor
│   └── shared/                      # Database models & logging
├── frontend/                        # Next.js 14 React observability portal
├── sdk/
│   ├── nodejs/                      # @auratrace/node TypeScript SDK
│   └── python/                      # auratrace Python SDK
└── scripts/                         # Verification & simulation utilities
    ├── demo_python_app.py           # Demo Python microservice with SDK
    ├── demo_node_app.js             # Demo Node.js microservice with SDK
    ├── simulate_crash.py            # Crash burst & anomaly simulator
    ├── reset_demo_db.py             # Safe database reset utility
    ├── stress_test.py               # Redis ingestion load test
    └── e2e_acceptance_verification.py # Full stack acceptance test suite
```

---

## Quickstart & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/sunilsingh175/auratrace.git
cd auratrace
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Update `.env` with your desired configuration, database credentials, master API key, and Gemini API key:
```env
AURA_MASTER_API_KEY=your_secure_master_key
GEMINI_API_KEY=your_gemini_api_key
POSTGRES_PASSWORD=your_postgres_password
```

### 3. Launch Services with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access Platform Interfaces
* **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Ingestion Gateway OpenAPI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **WebSocket Endpoint**: `ws://localhost:8000/ws/telemetry`
* **PostgreSQL (pgvector)**: `localhost:5432` (`trace_db`)
* **Redis Stream**: `localhost:6379` (`telemetry_stream`)

---

## Developer Usage & SDK Integration

### 1. Python SDK

Install the SDK or add it to your project:
```python
import auratrace

# Initialize with zero-config (runtime and service name auto-detected)
client = auratrace.init(
    api_key="your_project_or_master_api_key",
    endpoint="http://localhost:8000",
    service_name="payment-service",
    environment="production"
)

# Stream operational telemetry
client.capture_message("Payment batch processed", metadata={"count": 50})

# Capture exceptions with automated triage
try:
    process_payment()
except Exception as exc:
    client.capture_exception(exc, metadata={"customer_id": "cus_12345"})
```

### 2. Node.js SDK

```typescript
import { AuraTrace } from "@auratrace/node";

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY!,
  endpoint: "http://localhost:8000",
  serviceName: "order-service",
  environment: "production",
});

// Capture messages or caught exceptions
await AuraTrace.captureMessage("Order dispatched", { order_id: "ord_991" });
```

---

## Verification & Acceptance Testing

### 1. Run Backend Unit Tests
```bash
pytest
```
*Executes all authentication, Isolation Forest model inference, and sliding-window aggregation tests.*

### 2. Run Autonomous Crash Simulation
```bash
python scripts/simulate_crash.py
```
*Injects synthetic microservice telemetry bursts and crashes to trigger live ML anomaly detection and WebSocket updates.*

### 3. Run Microservice SDK Demos
```bash
# Node.js microservice SDK demo
node scripts/demo_node_app.js

# Python microservice SDK demo
python scripts/demo_python_app.py
```

### 4. Run End-to-End Acceptance Verification
```bash
python scripts/e2e_acceptance_verification.py
```
*Performs full lifecycle validation: provisions a project, runs SDK microservices, verifies anomaly detection, confirms pgvector semantic matches, checks Gemini AI Doctor diagnoses, and inspects PostgreSQL records.*

### 5. Reset Database for Clean Demos
```bash
python scripts/reset_demo_db.py
```
*Clears active telemetry and incidents while preserving user accounts, registered projects, and the vectorized knowledge base.*

---

## Author & Maintainer

* **GitHub**: [@sunilsingh175](https://github.com/sunilsingh175)
