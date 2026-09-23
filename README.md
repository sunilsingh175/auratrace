# Trace: AI-Powered Application Observability & Crash Diagnostics Platform

Trace is a decoupled, event-driven observability and automated root-cause analysis platform. It ingests continuous telemetry streams, detects system anomalies using unsupervised machine learning (Isolation Forest), and generates step-by-step diagnostic and recovery reports using Retrieval-Augmented Generation (RAG) and an LLM.

---

## Key Capabilities

* **Non-Blocking Telemetry Ingestion:** FastAPI accepts telemetry and writes it to Redis Streams (XADD) before returning HTTP 202. Client latency depends on the runtime environment and load; see the measured stress-test results below.
* **Unsupervised Anomaly Detection:** Rolling-window analysis via scikit-learn Isolation Forest to detect latency degradation, error-rate spikes, and other anomalous telemetry patterns.
* **Contextual RAG Diagnosis:** Stack traces are embedded and matched against historical fixes stored in PostgreSQL with pgvector; the retrieved context is supplied to the configured Gemini model for diagnosis and recovery steps.
* **Live WebSocket Telemetry:** Real-time telemetry and anomaly events are streamed to the Next.js dashboard.
* **SDG Goal 9 Alignment:** Supports software infrastructure resilience and reliability.

---

## Architectural Data Flow

```text
[ External Service / SDK ]
          │  1. POST /api/v1/telemetry
          ▼
 [ FastAPI Gateway ] ──► 2. XADD ──► [ Redis Stream Queue ]
                                            │
                                            ▼
                                  [ ML Anomaly Worker ]
                                  (5-minute window)
                                            │
                              3. Flag anomaly
                                            ▼
                                  [ PostgreSQL Incident ]
                                            │
                                            ▼
                                      [ RAG AI Doctor ]
                                      ├──► 4. Embed stack trace
                                      ├──► 5. pgvector similarity search
                                      └──► 6. Gemini diagnosis
                                            │
                                            ▼
                                  [ Redis Pub/Sub ]
                                            │
                                            ▼
                                  [ WebSocket Gateway ]
                                            │
                                            ▼
                                  [ Next.js Dashboard ]
```

Telemetry persistence is performed by the backend worker pipeline into PostgreSQL; Redis is the asynchronous stream buffer and event broker rather than a separate long-term archival store.

---

## Machine Learning Architecture & Benchmark Validation

Trace implements two complementary Isolation Forest workflows:

1. **Online Production Anomaly Detection:**
   * Operates on **8 operational telemetry features** (error_count, request_count, error_rate, avg_latency_ms, max_latency_ms, p95_latency_ms, status_5xx_rate, unique_error_types) aggregated over 5-minute per-service sliding windows.
   * Processes live telemetry from the Redis Stream.
   * An anomaly triggers incident creation and the RAG diagnostic pipeline.

2. **Offline Research Benchmark (LogHub HDFS_v1):**
   * Evaluates unsupervised Isolation Forest on **29 log event template counts (E1–E29)** across **575,061 block sessions** from the LogHub HDFS dataset (Xu et al., SOSP 2009).
   * Evaluated using a **stratified 70% Train / 30% Held-Out Test split** with zero label leakage.
   * **Full Dataset (575,061 sessions / 172,519 held-out test sessions) Empirical Results:**
     * **Held-out ROC-AUC:** 0.9597 (95.97%)
     * **PR-AUC (Average Precision):** 0.7147 (71.47%)
     * **Precision:** 0.6922 (69.22%)
     * **Recall:** 0.6076 (60.76%)
     * **F1-Score:** 0.6471 (64.71%)
     * **Inference Throughput:** 72,687 sessions/sec
   * *To reproduce:* python backend/ml_anomaly_service/evaluate_hdfs.py --samples 0

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
*(Review and update .env with your credentials and configuration.)*

### 3. Launch Services with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access Platform Interfaces
* **Live Monitoring Dashboard:** http://localhost:3000
* **Ingestion Gateway OpenAPI Docs:** http://localhost:8000/docs
* **Canonical WebSocket Stream:** ws://localhost:8000/ws/telemetry (aliases: /ws, /api/v1/ws)
* **PostgreSQL pgvector Database:** localhost:5432 (trace_db)
* **Redis Stream Broker:** localhost:6379 (telemetry_stream)

---

## Gateway Stress-Test Validation

The repository contains scripts/stress_test.py for the current Redis-buffered ingestion test.

A recorded run dispatched **1,000 requests with concurrency 50**:
* **HTTP 202:** 1,000 / 1,000
* **HTTP errors:** 0
* **Duration:** 10.562 s
* **Throughput:** 94.68 requests/sec
* **Mean latency:** 521.96 ms
* **P50 latency:** 318.95 ms
* **P95 latency:** 1,692.39 ms
* **P99 latency:** 2,856.42 ms
* **Redis Stream:** 7,016 → 8,016 entries (+1,000)
* **Persisted PostgreSQL records:** +1,000

These measurements demonstrate asynchronous Redis buffering and eventual persistence under the tested burst. They should not be interpreted as a guaranteed sub-20 ms client-latency SLA.

---

## 2-Minute Live Demo & Verification Sequence

1. **Start the Platform:**
   ```bash
   docker compose up -d
   ```
2. **Access Web Portal & Authenticate:**
   * Open `http://localhost:3000` (Dashboard).
   * Register or log in via `http://localhost:3000/login` as **Developer** or **Admin**.
3. **Provision a Microservice & Receive One-Time API Key:**
   * Navigate to `/services` and click **Register Service**.
   * Copy the returned one-time API key (`at_live_...`).
4. **Simulate Live Telemetry & Crash Burst:**
   ```bash
   python scripts/simulate_crash.py
   ```
5. **Observe Real-Time Anomaly Detection & AI Diagnosis:**
   * Watch the **Live Telemetry** stream at `/telemetry`.
   * Open `/incidents` to inspect the newly opened incident, anomaly confidence score, and AI root-cause analysis with suggested code patch.
6. **Run Automated Full Stack Verification:**
   ```bash
   python scripts/verify_full_live_stack.py
   ```

---

## Repository Structure

```text
trace/
├── docker-compose.yml
├── .env.example
├── README.md
├── database/
│   ├── 01-init.sql
│   ├── 02-seed.sql
│   └── 03-service-ownership.sql
├── backend/
│   ├── ingestion_service/
│   ├── ml_anomaly_service/
│   ├── rag-diagnostic-service/
│   └── shared/
├── frontend/
├── sdk/
│   └── nodejs/
└── scripts/
    ├── benchmark_ingestion.py
    ├── evaluate_hdfs.py
    ├── simulate_crash.py
    ├── stress_test.py
    ├── test_pipeline_integration.py
    └── verify_full_live_stack.py
```

---

## Author & Maintainer

* **GitHub:** [@sunilsingh175](https://github.com/sunilsingh175)
