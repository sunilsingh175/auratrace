---
marp: true
theme: default
paginate: true
header: 'AuraTrace — AI-Powered Observability & Autonomous Self-Healing'
footer: 'Final Year Project Presentation | Sri Ramakrishna Engineering College | 2025-2026'
---

# 🚀 AuraTrace
### AI-Powered Application Observability & Automated Crash Diagnostics Platform

**Presented by:**
- Sunil Singh (Roll No: 71812301062)
- Nikhil Patel (Roll No: 71812301069)

**Project Guide:** Mr. Gaurab Mudhbari, Assistant Professor (OG)
**Department:** Computer Science & Engineering (Batch 30)
**Institution:** Sri Ramakrishna Engineering College (2025–2026)

---

## 📌 Slide 1: Introduction & Problem Statement

* **The Production Reality:**
  - Modern cloud applications produce gigabytes of complex logs daily.
  - Industry average Mean Time To Recovery (**MTTR**) is **60–90 minutes** per incident.
  - **70% of incidents** are repeats of previously diagnosed issues.
* **The Observability Gap:**
  - Traditional tools (Datadog, Sentry, Splunk) tell developers **"WHAT"** failed through alerts and charts.
  - **None of them explain "WHY" or automatically generate "HOW TO FIX IT"**.
* **Our Mission:**
  - Close the loop from **Detection $\rightarrow$ AI Diagnosis $\rightarrow$ Automated PR & Hotpatch $\rightarrow$ Safe Rollback**.

---

## 🎯 Slide 2: Project Objectives

1. **Zero-Config Developer SDKs:** 2-line drop-in capture for Python & Node.js runtimes.
2. **Sub-Second Ingestion:** Non-blocking async telemetry pipeline handling $>50$ events/sec.
3. **Unsupervised ML Anomaly Detection:** Real-time scoring using Isolation Forest without pre-labeled data.
4. **Context-Aware AI Diagnosis:** RAG pipeline with pgvector similarity search + Google Gemini 2.0 Flash.
5. **Autonomous Git Remediation:** Automated unified diff generation, sandbox validation, and GitHub PR creation.
6. **5-Layer Safety & Rollback Guard:** Zero human intervention with continuous post-deploy regression guards.

---

## 🔍 Slide 3: Literature Survey & Gap Analysis

| Feature | Sentry | Datadog | Splunk | **AuraTrace (Our Work)** |
| :--- | :---: | :---: | :---: | :---: |
| **Crash Telemetry** | ✅ | ✅ | ✅ | ✅ |
| **Metric Dashboards** | ⚠️ | ✅ | ✅ | ✅ |
| **ML Anomaly Detection** | ⚠️ | ✅ | ✅ | ✅ (Isolation Forest) |
| **Contextual RAG Diagnosis** | ❌ | ⚠️ | ❌ | ✅ (pgvector + BGE 384-d) |
| **Automated PR & Git Diff** | ❌ | ❌ | ❌ | ✅ (Unified Diff Engine) |
| **Self-Healing / Auto-Merge** | ❌ | ❌ | ❌ | ✅ (5-Layer Safety) |
| **Self-Hostable & Free** | ⚠️ | ❌ | ❌ | ✅ (100% Open Source) |

---

## 🏗️ Slide 4: System Architecture

```
[ Developer App (SDK) ] ──(HTTPS/Async)──> [ Ingestion API Gateway (:8000) ]
                                                        │
                                                        ▼ (XADD)
                                            [ Redis Streams 7.2 ]
                                            (telemetry_stream)
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         ▼                              ▼                              ▼
                 [ ML Worker ]                   [ RAG Doctor ]               [ Repair Engine ]
             (Isolation Forest ML)             (pgvector + Gemini)           (Sandbox & Git PR)
                         │                              │                              │
                         └──────────────────────────────┼──────────────────────────────┘
                                                        ▼
                                       [ PostgreSQL 16 + pgvector ]
                                                        │
                                                        ▼
                                          [ Next.js 14 Dashboard (:3000) ]
```

---

## ⚡ Slide 5: Data Flow & Event Pipeline

1. **Capture:** SDK captures unhandled exceptions (`sys.excepthook` / `process.on`) and redacts PII/secrets.
2. **Buffer:** Ingestion API authenticates API keys via prefix index and pushes to Redis Stream ($<50\text{ms}$).
3. **Detect:** ML Worker computes 10-D rolling window features and flags statistical anomalies.
4. **Retrieve & Reason:** RAG Doctor converts stack traces into 384-d vectors, fetches top-5 historical fixes, and prompts Gemini.
5. **Validate & Patch:** Repair Worker tests patch in a sandbox, validates forbidden ASTs, and issues a GitHub PR.
6. **Deploy & Guard:** Merges PR, updates status, and monitors error rates for 20 minutes for auto-revert.

---

## 🤖 Slide 6: Machine Learning — Isolation Forest

* **Why Isolation Forest?**
  - Linear time complexity $O(n \log n)$ — highly efficient for real-time streams.
  - Requires **zero training labels** (production anomalies are rare outliers).
* **10-Dimensional Statistical Feature Vector:**
  - `event_count`, `error_count`, `crash_count`, `unique_services`
  - `avg_latency`, `max_latency`, `p95_latency`, `std_latency`
  - `events_per_second`, `error_rate` (sliding 60s window)
* **Confidence Scoring:**
  $$\text{Anomaly Score} = \text{Sigmoid}(-\text{decision\_function}(X)) \in [0, 1]$$

---

## 🩺 Slide 7: RAG Engine & AI Diagnostics

* **Step 1: Embedding Vectorization**
  - Error signature & top 10 stack frames $\rightarrow$ BAAI/bge-small-en-v1.5 (384 dimensions).
* **Step 2: Vector Similarity Search (PostgreSQL + pgvector)**
  ```sql
  SELECT id, suggested_fix, 1 - (embedding <=> $1::vector) AS similarity
  FROM incidents WHERE project_id = $2 AND similarity > 0.6
  ORDER BY similarity DESC LIMIT 5;
  ```
* **Step 3: Grounded Reasoning with Google Gemini 2.0 Flash**
  - Generates exact structured fields: `WHAT_HAPPENED`, `ROOT_CAUSE`, `AFFECTED_FILES`, and `CODE_PATCH`.

---

## 🛡️ Slide 8: 5-Layer Autonomous Repair Safety

To ensure production stability without human intervention:

1. **Patch Validator:** Regex blocklist rejects destructive shell commands (`rm -rf`, `eval`, `DROP TABLE`, `exec`).
2. **Sandbox Testing:** Tests code patch in an isolated temporary Git branch with test-runner execution.
3. **CI Status Gate:** Validates GitHub Actions / Check-Runs status before allowing any merge action.
4. **Safety Path Gate:** Blocks auto-merge on sensitive business logic (`auth/`, `payment/`, `billing/`, `.github/`).
5. **Rollback Guard:** Post-deployment regression monitor reverts commits if error rate exceeds $1.5\times$ baseline.

---

## 💻 Slide 9: Zero-Config Developer SDKs

### Python (2 Lines):
```python
import auratrace
auratrace.init(api_key="aura_live_...")
```

### Node.js (2 Lines):
```typescript
import { AuraTrace } from '@auratrace/node';
AuraTrace.init({ apiKey: "aura_live_..." });
```

* **Key Features:**
  - Zero external dependencies (uses standard library `http`/`urllib`).
  - Non-blocking background worker thread with bounded queue.
  - Client-side dual-pass secret & JWT sanitizer.

---

## 🌐 Slide 10: Next.js 14 Real-Time Dashboard

* **Modern Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
* **Core Pages:**
  - **Overview Dashboard:** Live KPI counters, service health status, latency graphs, and recent incidents.
  - **Incident Feed:** Real-time incident filtering by severity (`CRITICAL`, `HIGH`, `LOW`) and status.
  - **Incident Detail View:** Stack trace inspector, AI Root-Cause explanation, and interactive diff viewer.
  - **Auto-Repair Settings:** Project-level toggle for autonomous GitHub PR generation and Auto-Merge rules.

---

## 🧪 Slide 11: Testing & Performance Results

| Metric | Target Goal | AuraTrace Benchmark |
| :--- | :---: | :---: |
| **SDK Initialization Overhead** | $< 5\text{ms}$ | **$1.2\text{ms}$** ✅ |
| **Ingestion Latency (p95)** | $< 500\text{ms}$ | **$180\text{ms}$** ✅ |
| **Anomaly Detection Time** | $< 5\text{s}$ | **$\sim 1.8\text{s}$** ✅ |
| **AI Diagnosis Generation** | $< 60\text{s}$ | **$\sim 4.5\text{s}$** ✅ |
| **End-to-End Self-Healing** | $< 5\text{min}$ | **$45\text{seconds}$** ⚡ |
| **Throughput Capacity** | $> 30\text{ req/s}$ | **$40\text{--}60\text{ req/s}$** ✅ |

---

## 🌍 Slide 12: UN Sustainable Development Goals (SDG)

### **SDG 9: Industry, Innovation and Infrastructure**
* **Target 9.1 & 9.4:** Enhances software infrastructure resilience and minimizes system downtime across cloud industries.
* **Target 9.5:** Fosters open-source AI and AIOps research capabilities.
* **Target 9.c:** Completely self-hostable and free, enabling SMEs and startups to access enterprise-grade observability.

---

## 🔮 Slide 13: Limitations & Future Enhancements

* **Current Limitations:**
  - LLM hallucination risk (mitigated by RAG grounding & 5-layer safety).
  - Single-node Docker deployment configuration.
* **Future Work:**
  - Multi-region Kubernetes Operator (Helm / K8s CRD).
  - SDK expansion: Go, Rust, Java (JVM), C# (.NET).
  - Localized fine-tuned SLM (Small Language Model) for sub-second offline code patch synthesis.
  - Interactive Slack/Discord Bot for conversational ChatOps remediation.

---

## 🏁 Slide 14: Conclusion & Key Contributions

1. **Closed the Observability Loop:** First unified open-source system integrating Anomaly Detection, RAG Diagnostics, and Autonomous Git Remediation.
2. **Drastic MTTR Reduction:** Slashed Mean Time To Recovery from **60 minutes to 45 seconds**.
3. **Safety-First Autonomous AI:** Proved that self-healing software is viable when guarded by multi-layer deterministic validation.
4. **Complete Production Readiness:** Full microservice architecture with documentation, SDKs, and containerized deployment.

---

## ❓ Slide 15: Q&A / Live Demonstration

# Thank You!

**Project Repository:** `github.com/sunilsingh175/auratrace`
**Documentation:** `docs/PROJECT_REPORT.md` | `docs/VIVA_QA.md`

### Questions & Live Demo Session
*(Switching to Live Demonstration & System Verification)*
