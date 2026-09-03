-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the main table for RAG diagnostics
CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id VARCHAR(255) NOT NULL,
    error_type VARCHAR(255) NOT NULL,
    stack_trace TEXT,
    reason TEXT,
    ai_root_cause TEXT,
    ai_suggested_patch TEXT,
    embedding vector(384),
    is_diagnosed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an HNSW index for ultra-fast vector similarity search
CREATE INDEX IF NOT EXISTS incident_reports_embedding_idx 
ON incident_reports USING hnsw (embedding vector_cosine_ops);