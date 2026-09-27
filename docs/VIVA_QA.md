# 🎓 AuraTrace — Viva Voce Master Question & Answer Bank

Comprehensive preparation guide covering architecture, algorithms, trade-offs, security, and scaling.

---

## 🌟 Section 1: Observability Fundamentals

### Q1. What is the fundamental difference between monitoring and observability?
**Answer:** 
- **Monitoring** answers the question *"Is the system working?"* by evaluating predefined thresholds against known metrics (e.g., CPU > 85%, Error Rate > 2%).
- **Observability** answers the question *"Why is the system failing?"* by allowing developers to infer the internal state of a distributed application from its high-cardinality external outputs (structured logs, metrics, stack traces). Observability enables diagnosing novel, unprecedented failure modes without shipping new debug code.

### Q2. What are the three pillars of modern observability?
**Answer:**
1. **Logs**: Discrete, timestamped event records detailing specific occurrences.
2. **Metrics**: Numerically aggregated statistical values over time intervals (e.g., latency percentiles, throughput).
3. **Traces**: End-to-end journey maps of requests traversing distributed microservices.

### Q3. What is AIOps and what role does AuraTrace play?
**Answer:**
AIOps (Artificial Intelligence for IT Operations) combines big data and machine learning to automate IT operations processes, including event correlation, anomaly detection, and root-cause analysis. AuraTrace extends classical AIOps by introducing **autonomous remediation** — closing the loop from crash detection to pull request creation and verification.

### Q4. What is MTTR and how does AuraTrace impact it?
**Answer:**
Mean Time To Resolution (MTTR) is the average duration required to troubleshoot, fix, and restore a failed production system. Industry MTTR averages 60–90 minutes. AuraTrace reduces MTTR to **under 60 seconds** for recurring and semantic software exceptions.

---

## ⚙️ Section 2: Architecture & Stream Processing

### Q5. Why did you choose Redis Streams over standard Redis Lists (LPUSH/RPOP) or Pub/Sub?
**Answer:**
- **Consumer Groups (`XREADGROUP`)**: Distributes load across parallel workers with exclusive message delivery.
- **Message Acknowledgments (`XACK`)**: Prevents data loss; unprocessed messages remain in the Pending Entries List (PEL) until acknowledged.
- **Replayability & History**: Unlike Pub/Sub (fire-and-forget), streams persist historical events.
- **Capped Memory Footprint (`MAXLEN`)**: Automatically evicts oldest messages when memory ceilings are reached.

### Q6. Why did you choose FastAPI over Flask or Django?
**Answer:**
- **Asynchronous Concurrency**: Built on `Starlette` and `uvicorn`, handling thousands of non-blocking I/O requests per second.
- **Strict Data Validation**: `Pydantic v2` validates schemas at compiled C-speed.
- **Automatic OpenAPI Documentation**: Native Swagger UI portal generation.

### Q7. Why use pgvector in PostgreSQL instead of a standalone vector database like Pinecone or Milvus?
**Answer:**
- **Transactional Consistency (ACID)**: Relational metadata (projects, incident status) and vector embeddings live in the exact same database engine.
- **Zero Data Synchronization Drift**: Eliminates dual-write synchronization bugs between relational stores and vector indexes.
- **Cost & Simplicity**: Operates inside standard PostgreSQL without external cloud subscription dependencies.

---

## 🤖 Section 3: Machine Learning & Anomaly Detection

### Q8. How does Isolation Forest work?
**Answer:**
Isolation Forest is an unsupervised anomaly detection algorithm based on decision trees. It isolates anomalies instead of profiling normal points. Because anomalous data points have distinct attribute values, they require significantly fewer random partition splits (shorter tree path length $h(x)$) to be isolated compared to normal clustered points.

### Q9. What features are extracted for the ML model?
**Answer:**
A 10-dimensional feature vector calculated across a 60-second sliding rolling window:
1. `event_count` 2. `error_count` 3. `crash_count` 4. `unique_services`
5. `avg_latency` 6. `max_latency` 7. `p95_latency` 8. `std_latency`
9. `events_per_second` 10. `error_rate`

---

## 🧠 Section 4: RAG & AI Diagnostic Doctor

### Q10. What is Retrieval-Augmented Generation (RAG)?
**Answer:**
RAG is an AI framework that retrieves relevant factual documents from an external vector knowledge base and feeds them as ground truth context into a Large Language Model prompt. This eliminates hallucinations and enables the LLM to generate precise, codebase-specific code patches.

### Q11. Which embedding model did you choose and why?
**Answer:**
`BAAI/bge-small-en-v1.5`. It outputs compact **384-dimensional dense vectors**, loads with a small memory footprint (33M parameters), executes in milliseconds on CPU, and ranks at the top of the Massive Text Embedding Benchmark (MTEB).

### Q12. How do you prevent LLM hallucinations during code patch generation?
**Answer:**
1. Grounding prompt with top-5 cosine similarity historical fixes.
2. Unified diff format enforcement (`--- a/... +++ b/...`).
3. Confidence scoring gate ($> 0.75$).
4. Pre-merge sandbox syntax and test verification.

---

## 🛡️ Section 5: Security & Autonomous Safety Gates

### Q13. What is the 5-layer safety defense in the Repair Engine?
**Answer:**
1. **Patch Validator**: Blocks dangerous expressions (`rm -rf /`, `DROP TABLE`, `eval()`, `chmod 777`).
2. **Sandbox Tester**: Clones repository into an isolated directory and executes test suites (`npm test` / `pytest`).
3. **CI Gate**: Monitors GitHub check-runs until all continuous integration checks succeed.
4. **Sensitive Path Blocklist**: Prevents auto-merging changes to `auth/`, `payment/`, `billing/`, `.github/`, or infrastructure files.
5. **20-Minute Rollback Guard**: Monitors post-deploy production telemetry and automatically reverts pull requests if regression error rates spike.

### Q14. How are client API keys and GitHub tokens secured?
**Answer:**
- **API Keys**: Only bcrypt hashes (`$2b$12$...`) are stored; incoming keys are matched via prefix indexing and bcrypt verification.
- **GitHub Personal Access Tokens**: Encrypted using Fernet symmetric cryptography (`AES-128-CBC` with `HMAC-SHA256`).
- **Telemetry Payloads**: Sanitized on the client SDK and ingestion layer to scrub Bearer tokens, JWTs, AWS credentials, and API keys.
