-- ==============================================================================
-- AuraTrace Database Migration: 003_project_isolation.sql
-- Enforces strict project isolation for Services, Telemetry Logs, and Incidents.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SERVICES (Scoped strictly to projects)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS services_project_id_idx ON services (project_id);
CREATE INDEX IF NOT EXISTS services_service_id_idx ON services (service_id);
CREATE INDEX IF NOT EXISTS services_name_idx ON services (name);

-- ------------------------------------------------------------------------------
-- TELEMETRY LOGS (Project and Service scoped)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(16) NOT NULL DEFAULT 'INFO',
    message TEXT,
    error_type VARCHAR(255),
    stack_trace TEXT,
    latency_ms DOUBLE PRECISION,
    status_code INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source VARCHAR(32) NOT NULL DEFAULT 'sdk',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT telemetry_logs_level_check
        CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),

    CONSTRAINT telemetry_logs_latency_check
        CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS telemetry_logs_project_id_idx ON telemetry_logs (project_id);
CREATE INDEX IF NOT EXISTS telemetry_logs_service_id_idx ON telemetry_logs (service_id);
CREATE INDEX IF NOT EXISTS telemetry_logs_timestamp_idx ON telemetry_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS telemetry_logs_error_type_idx ON telemetry_logs (error_type);

-- ------------------------------------------------------------------------------
-- INCIDENTS (Explicit project_id foreign key)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    telemetry_id UUID REFERENCES telemetry_logs(id) ON DELETE SET NULL,
    anomaly_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    source VARCHAR(32) NOT NULL DEFAULT 'sdk',
    error_type VARCHAR(255),
    stack_trace TEXT,
    root_cause TEXT,
    suggested_patch TEXT,
    similar_fixes JSONB DEFAULT '[]'::jsonb,
    is_diagnosed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT incidents_severity_check
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    CONSTRAINT incidents_status_check
        CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS incidents_project_id_idx ON incidents (project_id);
CREATE INDEX IF NOT EXISTS incidents_service_id_idx ON incidents (service_id);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_error_type_idx ON incidents (error_type);
