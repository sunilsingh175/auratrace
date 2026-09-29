-- ==============================================================================
-- AuraTrace Database Migration: 002_projects.sql
-- Project management, ownership, and SHA256 hashed API keys.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(128) NOT NULL UNIQUE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS projects_api_key_hash_idx ON projects (api_key_hash);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects (owner_id);
