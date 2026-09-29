# AuraTrace Database Architecture & Migrations

AuraTrace uses PostgreSQL 16 with the `pgvector` and `uuid-ossp` extensions. All database schemas are managed through declarative SQL migrations.

---

## 1. Schema Migrations (`database/migrations/`)

| Migration | Purpose | Key Tables Created |
| :--- | :--- | :--- |
| `001_initial.sql` | PostgreSQL extensions & user accounts | `users` |
| `002_projects.sql` | Multi-tenant project management & auth | `projects`, `api_keys` |
| `003_project_isolation.sql` | Telemetry, services, and incidents with project scoping | `services`, `telemetry_logs`, `incidents` |
| `004_rag.sql` | pgvector vector store & embedding metadata | `historical_fixes` (with HNSW index) |
| `005_l3_repair.sql` | Autonomous repair configuration and run logs | `repair_settings`, `repair_runs` |

Seed Data: `database/seeds/historical_fixes.sql` supplies curated, verified historical fix templates.

---

## 2. Entity Relationship Diagram

```text
projects
   │
   ├── services
   │      ├── telemetry_logs
   │      └── incidents
   │
   ├── historical_fixes
   │
   └── repair_settings
          └── repair_runs
```

---

## 3. Multi-Tenant Foreign Key & Indexing Rules

- **Strict Foreign Keys:** Every service, incident, repair run, and private fix references `projects.id` with `ON DELETE CASCADE`.
- **Composite Unique Keys:** Services are keyed by `(project_id, service_id)`, guaranteeing name isolation across projects.
- **HNSW Vector Index:**
  ```sql
  CREATE INDEX idx_historical_fixes_embedding_hnsw
  ON historical_fixes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
