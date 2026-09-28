-- ==============================================================================
-- AuraTrace L3 Automated Repair Database Schema
-- Repair Settings & Autonomous Repair Runs
-- ==============================================================================

CREATE TABLE IF NOT EXISTS repair_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    github_repo VARCHAR(255),
    base_branch VARCHAR(100) DEFAULT 'main',
    encrypted_github_token TEXT,
    test_command TEXT DEFAULT 'pytest',
    auto_repair_enabled BOOLEAN DEFAULT FALSE,
    auto_merge_enabled BOOLEAN DEFAULT FALSE,
    regression_error_rate_threshold DOUBLE PRECISION DEFAULT 0.05,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    branch_name VARCHAR(255),
    pr_number INTEGER,
    pr_url TEXT,
    rollback_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
    safety_result JSONB DEFAULT '{}'::jsonb,
    sandbox_result JSONB DEFAULT '{}'::jsonb,
    ci_result JSONB DEFAULT '{}'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade existing schemas if migrating from legacy structures
ALTER TABLE repair_runs DROP CONSTRAINT IF EXISTS repair_runs_status_check;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS pr_number INTEGER;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS pr_url TEXT;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS rollback_status VARCHAR(50) NOT NULL DEFAULT 'NONE';
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS safety_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS sandbox_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS ci_result JSONB DEFAULT '{}'::jsonb;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE repair_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS repair_runs_incident_idx ON repair_runs (incident_id);
CREATE INDEX IF NOT EXISTS repair_runs_project_idx ON repair_runs (project_id);
CREATE INDEX IF NOT EXISTS repair_runs_status_idx ON repair_runs (status);
