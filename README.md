# AuraTrace: AI-Powered Application Observability & Crash Diagnostics Platform

AuraTrace is a decoupled, event-driven observability and automated root-cause analysis platform. It ingests continuous telemetry streams, detects system anomalies using unsupervised machine learning (Isolation Forest), and generates step-by-step code repair reports via Retrieval-Augmented Generation (RAG) and LLMs.

---

## Key Capabilities

* **Non-Blocking Telemetry Ingestion:** FastAPI gateway buffering logs directly into Redis Streams (`XADD`) with `<20ms` latency.
* **Unsupervised Anomaly Detection:** Rolling-window statistical analysis via `scikit-learn` Isolation Forest to catch memory leaks, latency degradation, and error spikes.
* **Contextual RAG Diagnosis:** Vector similarity matching in PostgreSQL (`pgvector`) against historical crash logs with Google GenAI (Gemini 2.5 Flash) RAG synthesis for actionable code diffs.
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

## Machine Learning Architecture & Benchmark Validation

AuraTrace implements two complementary Isolation Forest workflows:

1. **Online Production Anomaly Detection:**
   * Operates on **8 operational telemetry features** (`error_count`, `request_count`, `error_rate`, `avg_latency_ms`, `max_latency_ms`, `p95_latency_ms`, `status_5xx_rate`, `unique_error_types`) aggregated over 5-minute per-service sliding windows.
   * Real-time stream processing from Redis Streams (`logs:stream`).

2. **Offline Research Benchmark (LogHub HDFS_v1):**
   * Evaluates unsupervised Isolation Forest on **29 log event template counts (`E1`–`E29`)** across **575,061 block sessions** from the LogHub HDFS dataset (Xu et al., SOSP 2009).
   * Evaluated using a **stratified 70% Train / 30% Held-Out Test split** with zero label leakage.
   * **Full Dataset (575,061 sessions / 172,519 held-out test sessions) Empirical Results:**
     * **Held-out ROC-AUC:** `0.9597` (95.97%)
     * **PR-AUC (Average Precision):** `0.7147` (71.47%)
     * **Precision:** `0.6922` (69.22%)
     * **Recall:** `0.6076` (60.76%)
     * **F1-Score:** `0.6471` (64.71%)
     * **Inference Throughput:** `72,687` sessions/sec
   * *To reproduce:* `python backend/ml_anomaly_service/evaluate_hdfs.py --samples 0`

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
* **Canonical WebSocket Stream:** `ws://localhost:8000/ws/telemetry` *(aliases: `/ws`, `/api/v1/ws`)*
* **PostgreSQL pgvector Database:** `localhost:5432` (`auratrace_db`)
* **Redis Stream Broker:** `localhost:6379` (`telemetry_stream`)

---

## Gateway Throughput & Stress Test Validation

Executed high-concurrency ingestion stress testing via `scripts/benchmark_ingestion.py`:
* **Target:** `POST http://localhost:8000/api/v1/telemetry`
* **Concurrency:** 25 concurrent client workers
* **Volume:** 500 requests dispatched
* **HTTP Acceptance Rate:** `499 / 500` (**99.8%** HTTP 202 Accepted, 1 client connection timeout)
* **Redis Stream Buffer:** 500 entries captured in `telemetry_stream` (100% queue retention)
* **Latency Distribution:** P50: `54.39 ms` | Mean: `75.70 ms` | P95: `216.28 ms` | P99: `308.98 ms`
* **Throughput:** `44.6 req/sec`

---

## Repository Structure

```
auratrace/
├── docker-compose.yml                  # Root orchestration (Postgres, Redis, Ingestion, Workers, UI)
├── .env.example                        # Global environment variable templates
├── README.md                           # Setup and architectural documentation
│
├── database/                           # Persistence & Vector Storage Layer
│   ├── 01-init.sql                     # Schema definition (Tables, pgvector extension, HNSW indices)
│   └── 02-seed.sql                     # Pre-populated stack traces & verified code patches
│
├── backend/                            # Core Microservices Ecosystem
│   ├── ingestion_service/              # High-Throughput Log Gateway (FastAPI)
│   ├── ml_anomaly_service/             # Unsupervised Outlier Detector (Python Worker)
│   ├── rag-diagnostic-service/         # AI Crash Doctor & Root-Cause Generator (Gemini + pgvector)
│   └── shared/                         # Common Utilities & Database Models Across Workers
│
├── frontend/                           # Live Observability Dashboard (Next.js 14 App Router)
├── sdk/                                # Client Telemetry Capture Packages (Node.js & Python)
└── scripts/                            # Chaos Engineering & Load Testing Utilities
```

---

## Author & Maintainer

* **GitHub:** [@sunilsingh175](https://github.com/sunilsingh175)
