# AuraTrace Security Architecture

AuraTrace implements multi-tenant isolation, least privilege credential management, safe sandbox execution, and secret protection across all tiers.

---

## 1. Security Principles

### 1.1 Project Isolation
- API keys are strictly project-scoped. A project key cannot authenticate requests or query logs for another project.
- Telemetry, services, incidents, WebSocket channels, and private RAG embeddings are strictly partitioned by `project_id`.

### 1.2 Encrypted Credentials
- GitHub Personal Access Tokens (PAT) stored in `repair_settings` are encrypted at rest using AES-GCM symmetric encryption via `backend/repair_engine/crypto.py`.
- Plaintext tokens are never returned in REST API payloads (masked as `ghp_••••••••`).

### 1.3 Safe Sandbox Execution
- Sandbox test runners never invoke a raw shell (`shell=False`).
- Command execution is restricted to an allowlist (`pytest`, `npm test`).
- Target file diffs are inspected by the Safety Gate before any sandbox or GitHub branch execution.

### 1.4 Git & Environment Hygiene
- `.env`, `.env.*`, `backups/`, and `.dump` files are strictly excluded via `.gitignore`.
- No master or global API keys are exposed to client SDKs.
- Automatic merge is disabled (`auto_merge_enabled = False`) by default.
