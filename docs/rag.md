# AuraTrace RAG AI Diagnostics

AuraTrace pairs dense vector retrieval over historical fixes with LLM reasoning (Gemini) to perform automatic root cause analysis and patch synthesis.

---

## 1. RAG Architecture

```text
Incident Stack Trace + Error Context
                  │
                  ▼
       BAAI/bge-small-en-v1.5
                  │
                  ▼
       384-dimensional Embedding
                  │
                  ▼
     pgvector (HNSW Cosine Index)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
Project-Specific Fixes   Global Verified Fixes
  (Highest Priority)     (Public Patterns)
        └─────────┬─────────┘
                  ▼
        Top 3 Ranked Matches
                  │
                  ▼
         Gemini Diagnostic LLM
                  │
                  ▼
  Structured Diagnosis + Unified Diff Patch
```

---

## 2. Multi-Tenant Knowledge Isolation

To prevent proprietary source code or confidential bug fixes from leaking across project boundaries:

1. **Project Scoping:** Searches first query `WHERE project_id = :target_project_id`.
2. **Global Fallback:** If fewer than 3 matches exist, public verified knowledge is included (`WHERE is_global = TRUE`).
3. **Strict Partitioning:** Project A cannot view, embed, or retrieve fixes registered by Project B.

---

## 3. Embedding Metadata Schema

Every vector record stored in `historical_fixes` tracks provenance:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `project_id` | `UUID` | Owning project (`NULL` for global knowledge) |
| `is_global` | `BOOLEAN` | Whether this fix is verified public knowledge |
| `embedding_model` | `VARCHAR(64)` | Model identifier (`BAAI/bge-small-en-v1.5`) |
| `embedding_version` | `VARCHAR(32)` | Embedding version tag (`v1.5`) |
| `source` | `VARCHAR(64)` | Provenance tag (`curated_seed`, `user_submission`) |
| `verified_at` | `TIMESTAMPTZ` | Timestamp when fix was reviewed and verified |
| `embedding` | `vector(384)` | Dense embedding vector with HNSW index |
