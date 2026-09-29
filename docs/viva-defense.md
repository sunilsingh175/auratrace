# AuraTrace — Viva Voce Defense Guide & Technical Q&A

> **Core Project Definition:**  
> *"AuraTrace is an AI-powered autonomous application reliability platform that automatically detects application anomalies, diagnoses crashes using historical knowledge and an LLM, safely generates and validates repairs, and monitors the deployment for regression with automated rollback."*

---

### Q1: Why use Redis Streams instead of simple Redis Pub/Sub or RabbitMQ/Kafka for telemetry ingestion?
**Answer:**
- **At-least-once Delivery Semantics with Consumer Groups:** Standard Redis Pub/Sub is ephemeral "fire-and-forget" with zero backlog retention. Redis Streams provide consumer group semantics (`XREADGROUP` / `XACK`), allowing ML workers to track pending unacknowledged telemetry records (`XPENDING`) and reclaim unacknowledged tasks if a worker fails.
- **Lightweight Low-Latency Buffering vs. Kafka:** Kafka introduces substantial JVM and cluster management overhead. Redis Streams handle high-throughput telemetry writes in-memory with sub-millisecond latency, meeting the burst ingestion needs of distributed microservice SDKs with minimal resource footprint.

---

### Q2: Why choose Isolation Forest over supervised classifiers or deep learning (e.g., Autoencoders, LSTM)?
**Answer:**
- **Unsupervised Anomaly Isolation:** In real-world software crashes, failure modes are novel and unlabelled. Supervised classifiers fail on "zero-day" or unobserved crash patterns.
- **Linear Time Complexity $O(n \cdot t \cdot \log \psi)$:** Isolation Forest recursively isolates anomalies by random axis-aligned feature splits. Anomalies have short path lengths near the root of trees. This makes inference extremely fast ($< 30\text{ ms}$) without GPU hardware.
- **Explainability:** Tree depths map directly to anomalous feature boundaries, avoiding the opaque "black box" decisions of Deep Autoencoders.

---

### Q3: What are the eight production ML features, and why were they chosen?
**Answer:**
The 8 features compute real-time operational statistics over a 5-minute rolling window:
1. `error_count` — Volume of error-level logs and HTTP 5xx responses.
2. `request_count` — Total throughput/traffic volume.
3. `error_rate` — Ratio of errors to requests ($0.0 \to 1.0$).
4. `avg_latency_ms` — Mean service latency (detects gradual resource saturation).
5. `max_latency_ms` — Extreme tail latency spike (detects database deadlocks/lock contention).
6. `p95_latency_ms` — 95th percentile response time (filters out single outlier jitter).
7. `status_5xx_rate` — Ratio of severe server-side HTTP failures.
8. `unique_error_types` — Diversity of distinct exception class names (detects cascade failures across microservices).

---

### Q4: Why is HDFS treated as an offline benchmark rather than the production training dataset?
**Answer:**
- **Dataset Domain Mismatch:** The LogHub HDFS_v1 dataset consists of 2009 Hadoop distributed filesystem log block sequences parsed into 29 structured block state events. Modern web applications do not operate on Hadoop block replication logic.
- **Scientific Rigor:** HDFS is the standard benchmark in academic log analysis research (Xu et al., 2009). We use HDFS to prove that our Isolation Forest algorithm matches published academic baselines ($98.40\%$ accuracy), while using our 8-feature rolling window dataset for live web and cloud services.

---

### Q5: Why use pgvector with PostgreSQL rather than a dedicated vector database (Pinecone, Weaviate, Milvus)?
**Answer:**
- **ACID Transactions & Relational Joins:** AuraTrace queries vector similarity joined directly with relational project permissions, user ownership, and incident metadata in a single query.
- **Zero Distributed Sync Lag:** Using a separate vector DB creates eventual consistency lags and data sync failure modes between PostgreSQL and the vector index.
- **HNSW Cosine Index:** `pgvector` with Hierarchical Navigable Small World (HNSW) indexing delivers sub-10ms nearest-neighbor search over 384-dimensional dense vectors with zero additional infrastructure.

---

### Q6: How does RAG assist the LLM (Gemini) in generating reliable repairs?
**Answer:**
- **Grounding with Verified Historical Context:** RAG grounds the diagnosis using the live stack trace, system metrics, and retrieved historical fixes, reducing reliance on unsupported LLM-generated solutions.
- **Context Injection:** Instead of passing an isolated stack trace in a vacuum, the RAG pipeline retrieves the top-3 most similar verified historical fixes (`historical_fixes`) using pgvector dense cosine similarity.
- **Deterministic Diff Format:** Gemini is constrained by system prompts to return a structured JSON schema containing exact unified diff hunks rather than conversational prose.

---

### Q7: What does the Safety Gate protect against?
**Answer:**
The Safety Gate (`backend/repair_engine/safety.py`) evaluates the raw unified diff patch before any code execution:
1. **Restricted Files:** Blocks modifications to secret files (`.env`, `.env.*`, `id_rsa`, `*.pem`, `*.key`, `credentials.json`).
2. **Path Traversal:** Blocks paths escaping repository boundaries (`../`, `/etc/`, `/proc/`, `/root/`).
3. **Dangerous Command Injections:** Flags destructive commands in diff hunks (`rm -rf /`, `mkfs`, fork bombs, `curl | sh`, `os.system`, `subprocess(shell=True)`).

---

### Q8: Why is the sandbox verification step mandatory?
**Answer:**
- **Zero Corrupted Branches:** Generating a GitHub branch or PR with broken code creates noise, triggers wasteful CI runs, and risks broken deployments.
- **Pre-Commit Verification:** The mandatory sandbox (`backend/repair_engine/sandbox.py`) creates an isolated temporary directory, applies the patch via `git apply`, and executes the test suite (`pytest`, `npm test`) with `shell=False`. If tests fail or syntax is invalid, the repair run is immediately rejected before touching GitHub.

---

### Q9: How does AuraTrace prevent Project A from seeing Project B's private fixes?
**Answer:**
- **Multi-Tenant Filter in Vector Store:** When searching for similar fixes, `vector_store.search_similar_fixes()` executes a scoped SQL filter:
  `WHERE (project_id = :target_project_id OR is_global = TRUE)`
- **Tenant Boundary:** Project A can only retrieve its own historical fixes or curated global fixes. It cannot query or compute embeddings against Project B's private proprietary codebase fixes.

---

### Q10: What happens when the generated fix fails GitHub CI?
**Answer:**
- **CI Polling Gate (`wait_for_ci`):** The repair orchestrator polls GitHub check-runs for the repair branch.
- **Status Reporting:** If check-runs fail, the repair run status transitions to `CI_FAILED`, the error logs from the CI check are recorded in the database, and the PR remains open for developer inspection without merging.
- **No Auto-Merge:** Failed CI runs never proceed to deployment.

---

### Q11: What happens if a deployment initially succeeds but causes a regression?
**Answer:**
- **Post-Deploy Monitoring Window:** After PR merge, the repair orchestrator marks the run status as `MONITORING` and observes error rates in a 15-minute sliding window.
- **Threshold Comparison:** If the post-deploy error rate exceeds the pre-deploy baseline plus the configured threshold (e.g. baseline $+ 5\%$) or the exact crash recurs, the system marks the run as `REGRESSION_DETECTED`.

---

### Q12: How does automated rollback work?
**Answer:**
- **Revert Pull Request Generation:** The rollback module (`backend/repair_engine/rollback.py`) calls the GitHub API to generate an automated Revert Pull Request against the base branch targeting the merge commit SHA.
- **Real-Time Alert:** Broadcasts a high-priority `REPAIR_ROLLBACK` WebSocket event to the project dashboard alerting on-call engineers with the exact root cause and revert PR link.

---

### Q13: What happens if the Gemini LLM is unavailable or times out?
**Answer:**
- **Failsafe Diagnosis:** The RAG worker catches API exceptions, falls back to the top-ranked pgvector historical fix summary, and sets a structured diagnosis with fallback recommendations.
- **Non-Blocking:** The pipeline does not hang; the incident is recorded in PostgreSQL with status `DIAGNOSIS_FAILED_FALLBACK` and alerted to engineers.

---

### Q14: Why does the SDK fail silently on ingestion errors?
**Answer:**
- **Telemetry Observer Rule:** An observability tool must never crash or impair the host application it is monitoring.
- **Resilient Transport:** If AuraTrace's backend is down or network connectivity is severed, SDK worker threads drop telemetry packets silently and log a local debug message without throwing unhandled exceptions to user code.

---

### Q15: How does the Node.js SDK preserve original crash semantics?
**Answer:**
- **Flushing Before Exit:** In Node.js, an uncaught exception leaves the application in an undefined, corrupted memory state.
- **Interception + `process.exit(1)`:** Our hook intercepts `uncaughtException`, performs a synchronous/tight-timeout HTTP flush of the crash payload to AuraTrace, and then explicitly calls `process.exit(1)`. This ensures telemetry is delivered while guaranteeing the Node process exits with standard UNIX exit codes.
