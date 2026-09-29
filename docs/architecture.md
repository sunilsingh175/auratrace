# AuraTrace System Architecture

AuraTrace is an autonomous crash observability and self-healing platform engineered for multi-tenant software systems. It unifies automatic crash telemetry ingestion, ML-driven anomaly detection, pgvector RAG-assisted diagnosis, and L3 automated code remediation with post-deployment health verification and rollback guards.

---

## 1. High-Level System Architecture

```text
                 AuraTrace Multi-Tenant Architecture
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
   Developer SDK                                     Web Dashboard
         │                                                 │
         ▼                                                 ▼
 Fast Ingestion Gateway ◄──────────────────────── Next.js 14 Frontend
 (FastAPI + JWT Auth)                             (Server Actions + WS)
         │
         ▼
   Redis 7.2 Broker
 (Streams + Pub/Sub)
         │
         ▼
 ML Anomaly Engine (Worker)
 (Isolation Forest: 8 features)
         │
         ▼
 PostgreSQL 16 + pgvector
 (Partitioned Multi-Tenant DB)
         │
         ▼
 RAG AI Doctor (Worker)
 (BGE-small-en-v1.5 + Gemini)
         │
         ▼
 L3 Autonomous Repair Engine
 (Safety Gate + Sandbox + GitHub API)
         │
 ┌───────┴───────┐
 ▼               ▼
GitHub Branch   PR / CI Verification
                 │
                 ▼
          Automated Merge / Deploy
                 │
                 ▼
       Post-Deploy Monitoring
          ┌──────┴──────┐
          ▼             ▼
       Healthy       Rollback PR
```

---

## 2. Core Subsystems

### 2.1 Developer SDKs (Python & Node.js)
- Zero-boilerplate automatic crash and exception interception.
- Contextual metadata extraction (OS, runtime version, git commit, host, process environment).
- Non-blocking asynchronous batch queue with silent fallback on network failure.
- Guarantees natural process crash exit semantics (`process.exit(1)`).

### 2.2 Ingestion Gateway (`backend/ingestion_service`)
- Project API key verification and tenant routing.
- Asynchronous ingestion into Redis Stream (`telemetry_stream`).
- WebSocket Real-time Hub with partitioned `ConnectionManager` (events scoped strictly to `project_id`).
- REST APIs for project management, crash investigation, and repair management.

### 2.3 ML Anomaly Detection Service (`backend/ml_anomaly_service`)
- Sliding window buffer computing 8 operational telemetry features per service:
  1. `error_count`
  2. `request_count`
  3. `error_rate`
  4. `avg_latency_ms`
  5. `max_latency_ms`
  6. `p95_latency_ms`
  7. `status_5xx_rate`
  8. `unique_error_types`
- Isolation Forest anomaly model evaluating streaming traffic in real-time.
- Emits `ANOMALY_DETECTED` events to Redis Pub/Sub and records `incidents` in PostgreSQL.

### 2.4 RAG AI Diagnostic Service (`backend/rag-diagnostic-service`)
- 384-dimensional dense vector embeddings generated via `BAAI/bge-small-en-v1.5`.
- pgvector HNSW cosine index retrieval prioritizes project-specific fixes and global verified fixes.
- Multi-tenant tenant boundary enforcement: proprietary private fixes are never leaked across projects.
- Gemini LLM synthesizes structured root cause analysis and a unified diff patch (`suggested_patch`).

### 2.5 L3 Autonomous Repair Engine (`backend/repair_engine`)
- **Safety Gate:** Restricts sensitive files (`.env`, `.pem`, `.ssh`), path traversal, and dangerous execution patterns (`rm -rf`, `os.system`).
- **Mandatory Sandbox:** Creates an isolated temporary workspace, applies unified diff patch, and runs allowlisted test commands (`pytest`, `npm test`) with `shell=False`.
- **GitHub Integration:** Creates fix branches (`auratrace/repair/...`), commits code changes, opens Pull Requests, and tracks CI status.
- **Post-Deploy Telemetry Health Monitoring:** Compares pre-deploy baseline error rates against post-deploy telemetry.
- **Rollback Guard:** On performance regression or bug recurrence, automatically generates a revert PR.

---

## 3. Data Flow Lifecycle

| Step | Component | Action | Isolation Scope |
| :--- | :--- | :--- | :--- |
| 1 | SDK | Catches uncaught exception, extracts trace & metadata | Project API Key |
| 2 | Ingestion API | Authenticates API key, pushes to Redis stream | `project_id` |
| 3 | ML Worker | Aggregates rolling window & scores anomaly | `(project_id, service_id)` |
| 4 | DB | Persists new Incident | `project_id` |
| 5 | RAG Worker | Vector search for top-3 similar historical fixes | `project_id` + `is_global` |
| 6 | Gemini | Diagnoses root cause & generates unified diff patch | Incident scope |
| 7 | Repair Engine | Safety Gate inspection $\to$ Sandbox test execution | Isolated Workspace |
| 8 | GitHub Client | Creates branch $\to$ Commits patch $\to$ Opens PR | Project Repo & Token |
| 9 | CI Gate | Polls GitHub check-runs until PASSED | Repository |
| 10 | Monitoring | Observes post-deploy error rates for regression | `project_id` Window |
