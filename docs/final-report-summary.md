# AuraTrace — Final Year Project Technical Report Summary

---

## 1. Project Title & Abstract

**Title:** AuraTrace: An SDK-First Autonomous Crash Observability, Machine Learning Anomaly Detection, and Self-Healing Platform

**Abstract:**
Modern cloud-native and microservice architectures suffer from prolonged Mean Time to Resolution (MTTR) due to fragmented log aggregation, delayed manual alert triage, and error-prone manual patch authoring. AuraTrace introduces an end-to-end autonomous healing platform that bridges the gap between observability and code remediation. Utilizing zero-configuration SDKs, asynchronous Redis Stream ingestion, unsupervised tree-based anomaly detection (Isolation Forest), pgvector-driven dense vector retrieval, and Large Language Model (Gemini) synthesis, AuraTrace diagnoses crashes, validates code patches in an isolated sandbox, creates automated GitHub Pull Requests, and guards against post-deployment regressions with automated rollback capabilities.

> *"AuraTrace is an AI-powered autonomous application reliability platform that automatically detects application anomalies, diagnoses crashes using historical knowledge and an LLM, safely generates and validates repairs, and monitors the deployment for regression with automated rollback."*

---

## 2. Key Technical Contributions

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AuraTrace 10 Core Contributions                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Zero-Boilerplate SDKs (Python & Node.js with native exit preservation)   │
│ 2. Asynchronous Multi-Tenant Ingestion (FastAPI + Redis Streams)           │
│ 3. 8-Feature Rolling Window Isolation Forest Anomaly Detection Engine        │
│ 4. Academic HDFS_v1 Offline Benchmark & Production Telemetry Separation     │
│ 5. Multi-Tenant pgvector Dense Vector RAG (BGE-small-en-v1.5 embeddings)    │
│ 6. Gemini-Assisted Root Cause Diagnosis & Unified Diff Patch Synthesis      │
│ 7. Pre-Commit Safety Gate (Path traversal & dangerous command filtering)    │
│ 8. Mandatory Isolated Sandbox Test Verification (shell=False)               │
│ 9. GitHub Branch, Pull Request, & CI Check-Runs Orchestration               │
│ 10. Post-Deployment Telemetry Health Monitoring & Automated Revert PR Guard │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. System Architecture & Component Design

```text
               Developer Application
                         │
                         ▼
        AuraTrace SDK (Python / Node.js)
                         │
                         ▼
         FastAPI Ingestion Gateway (Port 8000)
                         │
                         ▼
             Redis 7.2 Broker (Streams)
                         │
                         ▼
         ML Anomaly Worker (Isolation Forest)
                         │
                         ▼
     PostgreSQL 16 + pgvector (Multi-Tenant DB)
                         │
                         ▼
        RAG AI Diagnostic Worker (Gemini)
                         │
                         ▼
            L3 Autonomous Repair Engine
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   Safety Gate                    Mandatory Sandbox
(Security Rules)              (Isolated Test Execution)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
              GitHub Branch & Auto PR
                         │
                         ▼
               GitHub CI Verification
                         │
                         ▼
              Controlled Merge & Deploy
                         │
                         ▼
          Post-Deploy Health Monitoring
            ┌────────────┴────────────┐
            ▼                         ▼
         Healthy             Regression Detected
                                      │
                                      ▼
                            Automated Rollback PR
```

---

## 4. Experimental Evaluation & Benchmark Results

> **Methodological Note:** Reported metrics represent evaluation on stated 80/20 unseen test sets under controlled benchmark conditions with zero data leakage.

### 4.1 Production 8-Feature Telemetry Detector
- **Model:** Isolation Forest ($n\_estimators=100$, contamination $= 0.15$)
- **Dataset:** 12,000 rolling-window operational telemetry records (6 failure scenarios).
- **Test Sample Size:** 2,400 unseen samples (20% split).

| Metric | Score | Analysis |
| :--- | :--- | :--- |
| **Accuracy** | `99.96%` | Precise classification across normal vs. fault windows |
| **Precision** | `100.00%` | Zero false positives generated in unseen test split |
| **Recall** | `99.72%` | Detected 359 out of 360 anomalous windows |
| **F1-Score** | `99.86%` | Harmonized precision-recall balance |
| **ROC-AUC** | `100.00%` | Complete separation of normal vs. anomalous decision distributions |
| **PR-AUC** | `100.00%` | High confidence under imbalanced anomaly conditions |
| **Inference Time** | `26.02 ms` | Real-time streaming evaluation per service window |

### 4.2 LogHub HDFS_v1 Academic Benchmark
- **Model:** Isolation Forest ($n\_estimators=100$, contamination $= 0.0285$)
- **Dataset:** LogHub HDFS_v1 (575,061 log block sequences, 29 event templates).
- **Test Sample Size:** 1,000 unseen test samples (20% split).
- **Results:** **Accuracy:** `98.40%` | **Precision:** `80.95%` | **Recall:** `58.62%` | **ROC-AUC:** `97.69%` | **PR-AUC:** `79.21%`.

---

## 5. Security & Multi-Tenancy Design

1. **Strict Project Scoping:** Database entities (`services`, `telemetry_logs`, `incidents`, `historical_fixes`, `repair_runs`) enforce foreign keys with `ON DELETE CASCADE` and `project_id` indexes.
2. **WebSocket Channel Isolation:** Real-time push alerts partition client connections by `project_id`.
3. **Encrypted Credentials:** Personal Access Tokens stored in `repair_settings` use AES-GCM encryption with masked UI presentation (`ghp_••••••••`).
4. **Sandboxed Command Execution:** Sandboxes prohibit raw shell execution (`shell=False`) and enforce allowlisted binaries (`pytest`, `npm test`).
