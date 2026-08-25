# AuraTrace: AI-Powered Application Observability & Crash Diagnostics Platform

AuraTrace is a decoupled, event-driven observability and automated root-cause analysis platform. It ingests continuous telemetry streams, detects system anomalies using unsupervised machine learning (Isolation Forest), and generates step-by-step code repair reports via Retrieval-Augmented Generation (RAG) and LLMs.

---

## Key Capabilities

* **Non-Blocking Telemetry Ingestion:** FastAPI gateway buffering logs directly into Redis Streams (`XADD`) with `<20ms` latency.
* **Unsupervised Anomaly Detection:** Rolling-window statistical analysis via `scikit-learn` Isolation Forest to catch memory leaks, latency degradation, and error spikes.
* **Contextual RAG Diagnosis:** Vector similarity matching in PostgreSQL (`pgvector`) against historical crash logs with LangChain-driven LLM synthesis for actionable code diffs.
* **Live WebSocket Telemetry:** Real-time event streaming to a Next.js 14 dashboard.
* **SDG Goal 9 Alignment:** Enhances enterprise software resilience and infrastructure reliability.

---

## Architectural Data Flow

```text
[ External Service / SDK ]
          │  1. Async POST (/api/v1/telemetry)
          ▼
 [ FastAPI Gateway ] ──► 2. XADD ──► [ Redis Stream Queue ]
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼ 3. XREADGROUP                               ▼ 3. XREADGROUP
          [ ML Anomaly Worker ]                         [ Long-Term Archival ]
          (Isolation Forest)                               (PostgreSQL)
                     │ 4. Flag Anomaly (Score > Threshold)
                     ▼
          [ RAG AI Doctor ]
          ├──► 5. Vectorize Stack Trace (all-MiniLM-L6-v2)
          ├──► 6. Similarity Search in pgvector
          └──► 7. Synthesize Root Cause & Patch via LLM
                     │
                     ▼ 8. PUBLISH Alert
          [ Redis Pub/Sub ] ──► 9. WebSockets ──► [ Next.js Live Dashboard ]
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
*(Review and update `.env` with your API keys and configuration)*

### 3. Launch Services with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access Platform Interfaces
* **Live Monitoring Dashboard:** [http://localhost:3000](http://localhost:3000)
* **Ingestion Gateway OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **PostgreSQL pgvector Database:** `localhost:5432` (`auratrace_db`)
* **Redis Stream Broker:** `localhost:6379`

---

## Repository Structure

```
auratrace/
├── docker-compose.yml                  # Root orchestration (Postgres, Redis, Ingestion, Workers, UI)
├── .env.example                        # Global environment variable templates
├── README.md                           # Setup and architectural documentation
│
├── database/                           # Persistence & Vector Storage Layer
│   ├── init.sql                        # Schema definition (Tables, pgvector extension, HNSW indices)
│   └── seed_knowledge_base.sql         # Pre-populated stack traces & verified code patches
│
├── backend/                            # Core Microservices Ecosystem
│   ├── ingestion-service/              # High-Throughput Log Gateway (FastAPI)
│   ├── ml-anomaly-service/             # Unsupervised Outlier Detector (Python Worker)
│   ├── rag-diagnostic-service/         # AI Crash Doctor & Root-Cause Generator (LangChain)
│   └── shared/                         # Common Utilities Across Workers
│
├── frontend/                           # Live Observability Dashboard (Next.js 14 App Router)
├── sdk/                                # Client Telemetry Capture Packages (Node.js & Python)
└── scripts/                            # Chaos Engineering & Load Testing Utilities
```

---

## Author & Maintainer

* **GitHub:** [@sunilsingh175](https://github.com/sunilsingh175)
