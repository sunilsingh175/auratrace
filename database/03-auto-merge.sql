-- ==============================================================================
-- AuraTrace Auto-Merge & Autonomous Deployment (L2 Pipeline) Schema
-- ==============================================================================

-- Add auto-merge / deploy settings to projects
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS auto_repair_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auto_merge_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS github_repo VARCHAR(255),
    ADD COLUMN IF NOT EXISTS github_base_branch VARCHAR(100) DEFAULT 'main',
    ADD COLUMN IF NOT EXISTS github_token_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS deploy_provider VARCHAR(50) DEFAULT 'webhook',
    ADD COLUMN IF NOT EXISTS deploy_webhook TEXT,
    ADD COLUMN IF NOT EXISTS deploy_webhook_secret TEXT,
    ADD COLUMN IF NOT EXISTS deploy_config JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS min_fix_confidence FLOAT DEFAULT 0.75,
    ADD COLUMN IF NOT EXISTS max_files_per_fix INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS max_merges_per_day INT DEFAULT 10,
    ADD COLUMN IF NOT EXISTS baseline_error_rate FLOAT DEFAULT 0.01,
    ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS notify_webhook_url TEXT;

-- Add merge tracking to incidents
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS diagnosis JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS fix_explanation TEXT,
    ADD COLUMN IF NOT EXISTS fix_confidence FLOAT,
    ADD COLUMN IF NOT EXISTS pr_url TEXT,
    ADD COLUMN IF NOT EXISTS pr_number INT,
    ADD COLUMN IF NOT EXISTS test_result JSONB,
    ADD COLUMN IF NOT EXISTS ci_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ci_result JSONB,
    ADD COLUMN IF NOT EXISTS merge_sha VARCHAR(64),
    ADD COLUMN IF NOT EXISTS deploy_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS post_deploy_measurements JSONB,
    ADD COLUMN IF NOT EXISTS reverted BOOLEAN DEFAULT FALSE;

-- Historical fixes enhancements
ALTER TABLE historical_fixes
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS incident_id UUID,
    ADD COLUMN IF NOT EXISTS error_signature VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fix_diff TEXT,
    ADD COLUMN IF NOT EXISTS was_applied BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS did_fix_work BOOLEAN DEFAULT TRUE;

-- Repair audit logging table
CREATE TABLE IF NOT EXISTS repair_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    incident_id UUID,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revert tracking index
CREATE INDEX IF NOT EXISTS idx_incidents_reverted
    ON incidents(reverted) WHERE reverted = true;

CREATE INDEX IF NOT EXISTS idx_incidents_project_id
    ON incidents(project_id);

CREATE INDEX IF NOT EXISTS idx_repair_audit_project_action
    ON repair_audit(project_id, action, created_at DESC);

-- Rate limit tracking view
CREATE OR REPLACE VIEW merges_today AS
SELECT
    project_id,
    DATE(created_at) AS day,
    COUNT(*) AS merge_count
FROM repair_audit
WHERE action = 'auto_merged'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY project_id, DATE(created_at);

-- Telemetry events table for raw event ingestion & window aggregation
CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL DEFAULT 'error',
    runtime JSONB DEFAULT '{}'::jsonb,
    payload JSONB DEFAULT '{}'::jsonb,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_project_time
    ON telemetry_events(project_id, received_at DESC);

-- Ensure all required columns exist on incidents
DO $$
BEGIN
    ALTER TABLE incidents ALTER COLUMN service_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS error_signature VARCHAR(255),
    ADD COLUMN IF NOT EXISTS runtime JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'production',
    ADD COLUMN IF NOT EXISTS service_name VARCHAR(255) DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS event_count INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_incidents_error_sig
    ON incidents(project_id, error_signature, last_seen DESC);

