# 🏛️ AuraTrace — System Architecture & Data Flow

## 1. High-Level System Architecture

```mermaid
graph TB
    A[Developer Application<br/>Python / Node.js] -->|Zero-Config SDK| B[Ingestion Gateway<br/>FastAPI :8000]
    B -->|XADD| C[(Redis Streams)]
    C -->|XREADGROUP| D[ML Anomaly Worker]
    D -->|INSERT| E[(PostgreSQL 16<br/>+ pgvector)]
    D -->|XADD| F[diagnose_stream]
    F -->|XREADGROUP| G[RAG Diagnostic Worker]
    G -->|Vector Similarity Search| E
    G -->|Prompt + Context| H[Google Gemini LLM]
    G -->|UPDATE| E
    G -->|XADD| I[repair_stream]
    I -->|XREADGROUP| J[Repair Worker]
    J -->|GitHub REST API| K[GitHub Repo / PR]
    J -->|UPDATE| E
    E -->|REST API & WS| L[Next.js 14 Dashboard<br/>:3000]
    B -->|Live WebSocket| L
```

---

## 2. Sequence Diagram — Autonomous Detection & Auto-Repair

```mermaid
sequenceDiagram
    autonumber
    participant App as Monitored App
    participant SDK as AuraTrace SDK
    participant API as Ingestion Gateway
    participant Redis as Redis Stream
    participant ML as ML Worker
    participant RAG as RAG Doctor
    participant DB as PostgreSQL (pgvector)
    participant Repair as Repair Engine
    participant GH as GitHub API
    participant UI as Next.js Dashboard

    App->>SDK: Uncaught Exception / Crash
    SDK->>SDK: Client-Side Secret Scrubbing
    SDK->>API: POST /v1/ingest (X-API-Key)
    API->>API: Prefix Lookup + bcrypt verify
    API->>Redis: XADD telemetry_stream
    API-->>SDK: 202 Accepted (event_id)
    Redis->>ML: XREADGROUP telemetry_stream
    ML->>DB: INSERT telemetry_events
    ML->>ML: Extract 10-D Rolling Window Features
    ML->>ML: Isolation Forest Anomaly Scoring
    alt Anomaly Score > 0.5 or Crash
        ML->>DB: INSERT incidents (status='detecting')
        ML->>Redis: XADD diagnose_stream
    end
    Redis->>RAG: XREADGROUP diagnose_stream
    RAG->>RAG: Generate 384-d Embedding (BGE)
    RAG->>DB: pgvector <=> Cosine Similarity Query
    DB-->>RAG: Top-5 Historical Similar Fixes
    RAG->>RAG: Synthesize Grounded Prompt
    RAG->>RAG: Gemini API (What Happened, Root Cause, Diff Patch)
    RAG->>DB: UPDATE incidents (status='fix_ready', suggested_patch)
    RAG->>Redis: XADD repair_stream
    Redis->>Repair: XREADGROUP repair_stream
    Repair->>Repair: Patch Validator (Forbidden Patterns Check)
    Repair->>Repair: Sandbox Test (git clone + npm test / pytest)
    Repair->>GH: Create Branch + Commit Patch + Open PR
    GH-->>Repair: PR URL (#123)
    Repair->>DB: UPDATE incidents (status='pr_created', pr_url)
    alt Auto-Merge Enabled & CI Passes & Tests Passed
        Repair->>GH: Squash & Merge PR
        Repair->>DB: UPDATE incidents (status='merged')
        Repair->>Repair: Launch 20-Min Post-Deploy Rollback Guard
    end
    DB->>UI: Real-Time Incident Stream Update
```

---

## 3. Database Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    PROJECTS ||--o{ TELEMETRY_EVENTS : receives
    PROJECTS ||--o{ INCIDENTS : tracks
    PROJECTS ||--o{ HISTORICAL_FIXES : stores
    PROJECTS ||--o{ REPAIR_AUDIT : logs
    INCIDENTS ||--o{ HISTORICAL_FIXES : produces
    INCIDENTS ||--o{ REPAIR_AUDIT : audits

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar role
        timestamptz created_at
    }

    PROJECTS {
        uuid id PK
        varchar name
        varchar slug UK
        varchar api_key_hash UK
        varchar api_key_prefix
        boolean auto_repair_enabled
        boolean auto_merge_enabled
        varchar github_repo
        text github_token_encrypted
        timestamptz created_at
    }

    INCIDENTS {
        uuid id PK
        uuid project_id FK
        varchar error_type
        text error_message
        text root_cause
        text stack_trace
        float anomaly_score
        varchar severity
        jsonb diagnosis
        text suggested_patch
        float fix_confidence
        varchar pr_url
        varchar status
        timestamptz created_at
    }

    HISTORICAL_FIXES {
        uuid id PK
        uuid incident_id FK
        varchar error_type
        text fix_diff
        vector_384 embedding
        timestamptz created_at
    }
```
