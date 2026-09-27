# AuraTrace: AI-Powered Application Observability & Automated Crash Diagnostics Platform

**Final Year Project Report**

---

## Project Details & Team

| Role | Details |
|------|---------|
| **Project Title** | AuraTrace: AI-Powered Observability & Autonomous Self-Healing Platform |
| **Student 1** | Sunil Singh (Roll No: 71812301062) |
| **Student 2** | Nikhil Patel (Roll No: 71812301069) |
| **Project Guide** | Mr. Gaurab Mudhbari, Assistant Professor (OG) |
| **Batch** | 30 |
| **Department** | Computer Science & Engineering |
| **Institution** | Sri Ramakrishna Engineering College |
| **Academic Year** | 2025 – 2026 |

---

## Abstract

Modern distributed applications generate massive volumes of log data and fail
in ways that are difficult to diagnose manually. Existing observability tools
(Datadog, Splunk, Sentry) surface alerts and graphs but do not explain root
causes, nor suggest fixes. This project introduces **AuraTrace**, an
end-to-end AI-powered observability platform that automatically:

1. Captures application crashes via zero-config SDKs (Python & Node.js)
2. Detects anomalous behavior using unsupervised Isolation Forest ML
3. Diagnoses root causes with Retrieval-Augmented Generation (RAG) using
   pgvector similarity search over historical incidents
4. Generates developer-reviewable unified-diff code patches via Google Gemini
5. Creates, tests, and optionally auto-merges GitHub pull requests
6. Monitors post-deployment error rate and auto-reverts on regression

The system is built on a containerized microservices architecture (FastAPI,
Redis Streams, PostgreSQL + pgvector, Next.js 14) and demonstrates how AI can
bridge the gap between "alert" and "fix" in production observability.

**Keywords:** AIOps, Observability, Anomaly Detection, Isolation Forest,
Retrieval-Augmented Generation, Automated Debugging, Self-Healing Systems

---

## Table of Contents

1. Introduction
2. Literature Survey
3. Problem Definition & Objectives
4. Existing Systems vs. AuraTrace
5. System Architecture
6. Methodology & Core Algorithms
7. Implementation Details
8. Testing & Experimental Validation
9. Results & Discussion
10. SDG Mapping (Goal 9)
11. Conclusion & Future Scope
12. References

---

## 1. Introduction

### 1.1 Background

Software applications in production write millions of log lines per day. When
a crash occurs, developers must manually trace through stack traces, cross-
reference historical incidents, and hand-craft fixes — a process that takes
hours even for experienced engineers. Industry studies show:

- The average Mean Time To Recovery (MTTR) for a production incident is
  **60-90 minutes** (Gartner, 2023)
- **70% of incidents** are repeats of previously-seen root causes
- **50% of developer time** is spent on debugging and incident response

Existing observability tools (Datadog, Splunk, New Relic) provide metrics,
dashboards, and alerts, but stop short of "why" and "how to fix." This leaves
a critical gap: the reasoning layer between detection and remediation.

### 1.2 Motivation

AuraTrace is built on three fundamental insights:

1. **Stack traces are semantic** — similar errors produce similar embeddings,
   enabling retrieval of past fixes via vector similarity.
2. **LLMs can reason about code** — given sufficient context, Gemini/GPT can
   generate correct patches, especially when grounded by historical examples.
3. **Autonomous repair is safe if validated** — sandbox testing, CI gates,
   and post-deploy rollback make auto-merge operationally sound.

### 1.3 Objectives

- Build zero-config SDKs that auto-instrument Python & Node.js apps
- Detect anomalies in real time with sub-second latency
- Diagnose crashes with RAG + LLM
- Generate developer-reviewable fix PRs
- Auto-merge if tests pass, with post-deploy regression guard
- Provide a real-time web dashboard

---

## 2. Literature Survey

### 2.1 Log Analysis & AIOps

He et al. (2023) survey log analysis techniques including template mining,
anomaly detection, and root-cause analysis, noting that most systems stop at
"alert" and do not generate fixes.

### 2.2 Anomaly Detection

Liu et al. (2022) demonstrate Isolation Forest's effectiveness for detecting
unusual server behavior without labeled data — a critical property for
production use where anomalies are rare.

### 2.3 Deep Learning for Logs

Du et al. (2017) introduce **DeepLog**, which converts log sequences into
vectors and uses LSTM to predict anomalies. Subsequent work (LogBERT, 2021)
improved on this using transformers.

### 2.4 RAG & LLMs

Lewis et al. (2020) introduce Retrieval-Augmented Generation, combining a
dense retriever (vector search) with a generative model. This is the
foundation of AuraTrace's diagnosis engine.

### 2.5 Message Queues for Telemetry

Wang et al. (2015) demonstrate Kafka's capacity for high-throughput log
replication. Redis Streams provide similar semantics with lower operational
overhead for smaller-scale systems.

### 2.6 Gap Analysis

| Study | Detection | Diagnosis | Fix Generation | Auto-Repair |
|-------|-----------|-----------|----------------|-------------|
| AIOps Survey (2023) | ✅ | ⚠️ | ❌ | ❌ |
| Isolation Forest (2022) | ✅ | ❌ | ❌ | ❌ |
| DeepLog (2017) | ✅ | ⚠️ | ❌ | ❌ |
| RAG (2020) | ⚠️ | ✅ | ⚠️ | ❌ |
| **AuraTrace (this work)** | ✅ | ✅ | ✅ | ✅ |

---

## 3. Problem Definition & Objectives

### 3.1 Problem Statement

Production crashes generate thousands of confusing log lines. Existing
observability tools surface alerts but do not:

- Explain root cause in plain English
- Suggest specific code fixes
- Automate the fix-verify-deploy loop

### 3.2 Scope

**In scope:**
- Python and Node.js SDKs
- Web application crash detection
- ML-based anomaly detection
- LLM-powered diagnosis
- GitHub integration

**Out of scope:**
- Native mobile apps
- Hardware/IoT telemetry
- Real-time video/audio analysis

---

## 4. Existing Systems vs. Proposed System

| Feature | Datadog | Splunk | Sentry | Prometheus | **AuraTrace** |
|---------|---------|--------|--------|------------|---------------|
| Log ingestion | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Metrics | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Anomaly detection | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| AI diagnosis | ⚠️ | ⚠️ | ❌ | ❌ | ✅ |
| Auto-fix PR | ❌ | ❌ | ❌ | ❌ | ✅ |
| Self-hostable | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| Open SDK | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| Cost | $$$ | $$$ | $$ | Free | Free/OSS |

---

## 5. System Architecture

AuraTrace uses a distributed, stream-driven microservices architecture:

1. **Ingestion Layer (FastAPI)**: Validates incoming telemetry and immediately pushes to `telemetry_stream`.
2. **Buffer Queue (Redis Streams)**: Decouples high-throughput ingestion from ML and LLM computation.
3. **ML Anomaly Worker**: Computes 10-dimensional rolling window statistical features and evaluates Isolation Forest.
4. **RAG AI Doctor**: Vectorizes errors (384-d BAAI/bge-small-en-v1.5) and retrieves similar historical fixes via pgvector `<=>` cosine similarity.
5. **Repair Engine**: Validates unified diff patches, executes isolated sandbox tests, creates GitHub PRs, and manages auto-merge and regression guards.
6. **Dashboard (Next.js 14)**: Live incident triage, AI root-cause viewer, and auto-repair toggle controls.

---

## 6. Methodology & Core Algorithms

### 6.1 Anomaly Detection Feature Extraction (10 Dimensions)
- `event_count`, `error_count`, `crash_count`, `unique_services`
- `avg_latency`, `max_latency`, `p95_latency`, `std_latency`
- `events_per_second`, `error_rate`

### 6.2 Semantic Vector Retrieval
```sql
SELECT id, suggested_fix,
       1 - (embedding <=> $1::vector) AS similarity
FROM incidents
WHERE project_id = $2
  AND (1 - (embedding <=> $1::vector)) > 0.6
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

---

## 7. SDG Mapping

**SDG 9 — Industry, Innovation and Infrastructure**

AuraTrace directly contributes to Goal 9 by:
- **Building resilient infrastructure** — reducing software downtime from hours to seconds.
- **Fostering innovation** — advancing autonomous AIOps and software self-healing research.
- **Supporting SMEs** — completely open-source, modular, and self-hostable without vendor lock-in.

---

## 8. Conclusion

AuraTrace demonstrates that the gap between "alert" and "fix" in production
observability can be closed using zero-config SDKs, unsupervised ML, RAG vector retrieval, and automated pull requests with strict 5-layer safety gates.
