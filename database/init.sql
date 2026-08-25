-- =============================================================================
-- AuraTrace Database Initialization Script
-- Configures Extensions, Tables, Indexes, and Partitioning
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Clean Up Existing Objects (For fresh container spins)
DROP TABLE IF EXISTS incident_reports CASCADE;
DROP TABLE IF EXISTS incident_knowledge_base CASCADE;
DROP TABLE IF EXISTS telemetry_logs CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- 3. Services / Registered Applications
CREATE TABLE services (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    api_key VARCHAR(128) UNIQUE NOT NULL,
    environment VARCHAR(32) DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Raw Telemetry Logs Table
CREATE TABLE telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    level VARCHAR(16) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    latency_ms DOUBLE PRECISION DEFAULT 0.0,
    error_type VARCHAR(128),
    message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for fast aggregation and window filtering
CREATE INDEX idx_telemetry_service_time ON telemetry_logs (service_id, timestamp DESC);
CREATE INDEX idx_telemetry_level ON telemetry_logs (level);

-- 5. Historical Incident Knowledge Base (For RAG Engine Vector Search)
-- Embedding Dimension: 384 (matches sentence-transformers/all-MiniLM-L6-v2 & bge-small-en-v1.5)
CREATE TABLE incident_knowledge_base (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(128) NOT NULL,
    stack_trace_pattern TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    recommended_patch TEXT NOT NULL,
    embedding VECTOR(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast Approximate Nearest Neighbor (ANN) Index using HNSW and Cosine Distance
CREATE INDEX idx_kb_embedding_hnsw 
ON incident_knowledge_base 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Generated Incident Reports & Live Anomalies
CREATE TABLE incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    anomaly_score DOUBLE PRECISION NOT NULL,
    status VARCHAR(32) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    error_type VARCHAR(128),
    raw_stack_trace TEXT NOT NULL,
    ai_root_cause TEXT,
    ai_suggested_patch TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_incidents_status_time ON incident_reports (status, created_at DESC);

-- 7. Seed Default Master Service for Immediate Out-of-the-Box Ingestion
INSERT INTO services (id, name, api_key, environment)
VALUES 
    ('default-service', 'AuraTrace Core Service', 'aura_secret_key_123', 'production'),
    ('payment-service', 'Payment Microservice', 'aura_payment_secret_456', 'production'),
    ('auth-service', 'Authentication Microservice', 'aura_auth_secret_789', 'production');