# 🗄️ AuraTrace Database Schema

PostgreSQL 16 + `pgvector` extension schema specification.

---

## 📊 Tables Overview

### 1. `projects`
Stores provisioned workspaces, hashed API credentials, and repository auto-repair settings.
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), Unique)
- `api_key_hash` (VARCHAR(128), Unique)
- `api_key_prefix` (VARCHAR(32))
- `auto_repair_enabled` (BOOLEAN, Default FALSE)
- `auto_merge_enabled` (BOOLEAN, Default FALSE)
- `github_repo` (VARCHAR(255))
- `github_base_branch` (VARCHAR(100), Default 'main')
- `github_token_encrypted` (TEXT)
- `min_fix_confidence` (FLOAT, Default 0.75)
- `created_at` (TIMESTAMPTZ)

### 2. `telemetry_events`
High-throughput time-series store for raw telemetry used by Isolation Forest rolling windows.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `service_name` (VARCHAR(100))
- `environment` (VARCHAR(50))
- `event_type` (VARCHAR(50))
- `error_type` (VARCHAR(100))
- `error_message` (TEXT)
- `stack_trace` (TEXT)
- `latency_ms` (FLOAT)
- `received_at` (TIMESTAMPTZ)

### 3. `incidents`
Tracked anomalies, diagnoses, code patches, and PR lifecycle states.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `error_type` (VARCHAR(100))
- `error_message` (TEXT)
- `root_cause` (TEXT)
- `stack_trace` (TEXT)
- `error_signature` (VARCHAR(64))
- `anomaly_score` (FLOAT)
- `severity` (VARCHAR(20))
- `status` (VARCHAR(30)) — `detecting`, `fix_ready`, `pr_created`, `merged`, `resolved`, `reverted`
- `diagnosis` (JSONB)
- `suggested_patch` (TEXT)
- `fix_explanation` (TEXT)
- `fix_confidence` (FLOAT)
- `pr_url` (TEXT)
- `pr_number` (INT)
- `created_at` (TIMESTAMPTZ)

### 4. `historical_fixes`
Vector database storing 384-dimensional dense semantic embeddings for RAG retrieval.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `incident_id` (UUID, Foreign Key)
- `error_type` (VARCHAR(100))
- `error_message` (TEXT)
- `fix_diff` (TEXT)
- `embedding` (VECTOR(384))
- `created_at` (TIMESTAMPTZ)
