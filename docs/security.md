# AuraTrace Security Architecture

AuraTrace implements multi-tenant isolation, least privilege credential management, safe sandbox execution, and secret protection across all tiers.

---

## 1. Security Principles

### 1.1 Project & WebSocket Multi-Tenant Isolation
- API keys are strictly project-scoped. A project key cannot authenticate requests, query logs, list services, or triage incidents for another project.
- Telemetry, services, incidents, repair runs, and private RAG embeddings are strictly partitioned by `project_id`.
- WebSocket endpoints (`/ws/telemetry`, `/api/v1/ws/telemetry`) require token/API-key authentication and lock connections strictly to the authorized project. Global event broadcasts do not leak project events to other tenants.
- System-owned projects (`owner_id IS NULL`) are protected against unauthorized modification or deletion by non-admin accounts.

### 1.2 Encrypted Credentials & Secret Hygiene
- GitHub Personal Access Tokens (PAT) stored in `repair_settings` are encrypted at rest using Fernet symmetric encryption via `backend/repair_engine/crypto.py`.
- Plaintext tokens are never returned in REST API payloads (masked as `ghp_••••••••`).
- Encryption keys are derived dynamically from environment configuration without static plaintext fallbacks.

### 1.3 Safe Sandbox Workspace Execution
- Sandbox test runners operate in isolated temporary workspace directories and never invoke a raw shell (`shell=False`).
- Command execution is restricted to an allowlist (`pytest`, `python -m pytest`, `npm test`, `npm run test`) with strict process timeouts.
- Target file diffs and paths are pre-inspected by the Safety Gate before any workspace application or GitHub branch dispatch. Workspace isolation is a controlled execution boundary.

### 1.4 Git & Environment Hygiene
- `.env`, `.env.*`, `backups/`, and `.dump` files are strictly excluded via `.gitignore`.
- No master or global bootstrap keys are exposed to client SDKs.
- Automatic pull request merging is disabled (`auto_merge_enabled = False`) by default.

