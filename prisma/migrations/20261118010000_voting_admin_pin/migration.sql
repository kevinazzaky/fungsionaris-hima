ALTER TABLE voting_settings
  ADD COLUMN admin_pin_hash TEXT,
  ADD COLUMN pin_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN pin_updated_at TIMESTAMPTZ(3);
