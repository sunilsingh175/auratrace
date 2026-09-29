-- ==============================================================================
-- AuraTrace Database Migration: 004_rag.sql
-- Vector search database schema with multi-tenant isolation, metadata & HNSW index.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS historical_fixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    error_type VARCHAR(255),
    stack_trace TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    fix_description TEXT,
    code_patch TEXT,
    embedding vector(384),
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'bge-small-en-v1.5',
    embedding_version VARCHAR(20) NOT NULL DEFAULT '1',
    source VARCHAR(100) NOT NULL DEFAULT 'verified_kb',
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS historical_fixes_project_id_idx ON historical_fixes (project_id);
CREATE INDEX IF NOT EXISTS historical_fixes_is_global_idx ON historical_fixes (is_global);
CREATE INDEX IF NOT EXISTS historical_fixes_error_type_idx ON historical_fixes (error_type);

-- HNSW Vector Cosine Distance Index for sub-millisecond similarity search
CREATE INDEX IF NOT EXISTS historical_fixes_embedding_hnsw_idx 
    ON historical_fixes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
