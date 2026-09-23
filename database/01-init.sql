-- ==============================================================================
-- AuraTrace Database Initialization
-- PostgreSQL + pgvector
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==============================================================================
-- USERS & AUTHENTICATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Developer', 'Admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- PROJECTS (AuraTrace Project & API Key Management)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(128) NOT NULL UNIQUE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- SERVICES (Automatically Discovered from Telemetry or Provisioned)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    service_id VARCHAR(255),

    name VARCHAR(255) NOT NULL,

    runtime VARCHAR(50) NOT NULL DEFAULT 'node',

    environment VARCHAR(50) NOT NULL DEFAULT 'production',

    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',

    description TEXT,

    api_key_hash VARCHAR(128),

    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT services_environment_check
        CHECK (environment IN ('development', 'staging', 'production')),

    CONSTRAINT services_status_check
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEGRADED'))
);


-- ==============================================================================
-- TELEMETRY LOGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    service_id UUID NOT NULL,

    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    level VARCHAR(16) NOT NULL DEFAULT 'INFO',

    message TEXT,

    error_type VARCHAR(255),

    stack_trace TEXT,

    latency_ms DOUBLE PRECISION,

    status_code INTEGER,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT telemetry_logs_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    CONSTRAINT telemetry_logs_level_check
        CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),

    CONSTRAINT telemetry_logs_latency_check
        CHECK (latency_ms IS NULL OR latency_ms >= 0)
);


-- ==============================================================================
-- INCIDENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    service_id UUID NOT NULL,

    telemetry_id UUID,

    anomaly_score DOUBLE PRECISION NOT NULL DEFAULT 0,

    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',

    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',

    error_type VARCHAR(255),

    stack_trace TEXT,

    root_cause TEXT,

    suggested_patch TEXT,

    is_diagnosed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    resolved_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT incidents_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE CASCADE,

    CONSTRAINT incidents_telemetry_fk
        FOREIGN KEY (telemetry_id)
        REFERENCES telemetry_logs(id)
        ON DELETE SET NULL,

    CONSTRAINT incidents_anomaly_score_check
        CHECK (anomaly_score >= 0 AND anomaly_score <= 1),

    CONSTRAINT incidents_severity_check
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    CONSTRAINT incidents_status_check
        CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED'))
);


-- ==============================================================================
-- HISTORICAL FIXES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS historical_fixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    service_id UUID,

    error_type VARCHAR(255),

    stack_trace TEXT NOT NULL,

    root_cause TEXT NOT NULL,

    fix_description TEXT,

    code_patch TEXT,

    embedding vector(384),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT historical_fixes_service_fk
        FOREIGN KEY (service_id)
        REFERENCES services(id)
        ON DELETE SET NULL
);


-- ==============================================================================
-- INDEXES
-- ==============================================================================

-- Projects
CREATE INDEX IF NOT EXISTS projects_owner_idx
    ON projects (owner_id);

CREATE INDEX IF NOT EXISTS projects_api_key_hash_idx
    ON projects (api_key_hash);

-- Services
CREATE INDEX IF NOT EXISTS services_status_idx
    ON services (status);

CREATE INDEX IF NOT EXISTS services_project_id_idx
    ON services (project_id);

CREATE INDEX IF NOT EXISTS services_service_id_idx
    ON services (service_id);

CREATE INDEX IF NOT EXISTS services_project_service_idx
    ON services (project_id, service_id);

-- Telemetry
CREATE INDEX IF NOT EXISTS telemetry_logs_project_idx
    ON telemetry_logs (project_id);

CREATE INDEX IF NOT EXISTS telemetry_logs_service_idx
    ON telemetry_logs (service_id);

CREATE INDEX IF NOT EXISTS telemetry_logs_timestamp_idx
    ON telemetry_logs (timestamp DESC);

CREATE INDEX IF NOT EXISTS telemetry_logs_service_timestamp_idx
    ON telemetry_logs (service_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS telemetry_logs_error_type_idx
    ON telemetry_logs (error_type);


-- Incidents
CREATE INDEX IF NOT EXISTS incidents_service_idx
    ON incidents (service_id);

CREATE INDEX IF NOT EXISTS incidents_status_idx
    ON incidents (status);

CREATE INDEX IF NOT EXISTS incidents_severity_idx
    ON incidents (severity);

CREATE INDEX IF NOT EXISTS incidents_anomaly_score_idx
    ON incidents (anomaly_score DESC);

CREATE INDEX IF NOT EXISTS incidents_created_at_idx
    ON incidents (created_at DESC);


-- Historical fixes
CREATE INDEX IF NOT EXISTS historical_fixes_error_type_idx
    ON historical_fixes (error_type);

CREATE INDEX IF NOT EXISTS historical_fixes_created_at_idx
    ON historical_fixes (created_at DESC);


-- ==============================================================================
-- pgvector HNSW INDEX
-- ==============================================================================

CREATE INDEX IF NOT EXISTS historical_fixes_embedding_idx
    ON historical_fixes
    USING hnsw (embedding vector_cosine_ops);