# 📜 Changelog

All notable changes to **AuraTrace** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-26

### 🚀 Added
- **Zero-Config SDKs:**
  - Python (`auratrace-sdk` via `pip install -e sdk/python`) with standard library async transport and automatic `sys.excepthook` interceptors.
  - Node.js (`@auratrace/node` via `sdk/nodejs`) with `process.on('uncaughtException')` hooks.
- **Ingestion Service Gateway:**
  - High-throughput FastAPI HTTP API (`/v1/ingest`, `/v1/ingest/batch`, `/v1/projects`) buffering directly into Redis 7.2 Streams.
  - Real-time WebSocket incident streaming channel (`/ws/incidents/{project_id}`).
  - Prefix-indexed bcrypt API key authentication and sliding-window rate limiting.
- **ML Anomaly Worker:**
  - Real-time Isolation Forest statistical anomaly detection on 10-dimensional rolling window metric vectors.
- **RAG Diagnostic Doctor:**
  - Semantic stack trace embedding with `BAAI/bge-small-en-v1.5` (384-d).
  - PostgreSQL + pgvector `<=>` cosine distance similarity search over historical incidents.
  - LLM diagnostic reasoning and unified diff synthesis powered by Google Gemini 2.0 Flash.
- **Autonomous Repair Engine:**
  - 5-layer safety architecture: AST/Regex patch validation, sandbox subprocess execution, GitHub Check-Runs gate, sensitive path blocker (`auth/`, `payment/`, `.github/`), and 20-minute post-deploy rollback guard.
  - Automated GitHub branch creation, commit staging, and Pull Request publishing.
- **Frontend Observability Dashboard:**
  - Next.js 14 App Router, TypeScript, and custom dark Tailwind aesthetic with KPI metric cards, incident feeds, diff viewers, and project auto-repair settings.
- **Production Hardening:**
  - Multi-stage Docker builds, resource-constrained `docker-compose.prod.yml`, Nginx reverse proxy with SSL/TLS and gzip compression, and daily automated backup & restore scripts.
- **Academic Submission Suite:**
  - Complete 60+ page project report, 15-slide viva presentation deck, and 55+ question viva bank.

### 🛡️ Security
- Dual-pass secret and JWT sanitization on both client SDK and server ingestion gateway.
- AES-128-CBC Fernet encryption for stored GitHub access tokens and OAuth credentials.
