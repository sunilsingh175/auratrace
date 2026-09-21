-- Trace service ownership migration
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE services
    DROP CONSTRAINT IF EXISTS services_owner_fk;

ALTER TABLE services
    ADD CONSTRAINT services_owner_fk
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS services_owner_idx
    ON services (owner_id);
