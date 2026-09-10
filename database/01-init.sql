-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    api_key_hash VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id VARCHAR(255) NOT NULL,
    error_type VARCHAR(255) NOT NULL,
    stack_trace TEXT,
    reason TEXT,
    ai_root_cause TEXT,
    ai_suggested_patch TEXT,
    anomaly_score DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    is_diagnosed BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS incident_reports_embedding_idx
ON incident_reports USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS incident_reports_service_idx
ON incident_reports (service_id);

CREATE INDEX IF NOT EXISTS incident_reports_status_idx
ON incident_reports (status);

CREATE INDEX IF NOT EXISTS incident_reports_created_at_idx
ON incident_reports (created_at DESC);
