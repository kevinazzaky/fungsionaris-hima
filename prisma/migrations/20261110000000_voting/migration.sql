BEGIN;

CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','closed')),
  starts_at TIMESTAMPTZ(3), ends_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status = 'draft' OR (starts_at IS NOT NULL AND ends_at > starts_at))
);
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
  number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 6),
  name TEXT NOT NULL DEFAULT '', vision TEXT NOT NULL DEFAULT '',
  missions TEXT[] NOT NULL DEFAULT '{}', programs JSONB NOT NULL DEFAULT '[]',
  photo_path TEXT, placeholder BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(election_id, number), UNIQUE(id, election_id)
);
CREATE TABLE eligible_voters (
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
  voter_key TEXT NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT true, consumed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY(election_id, voter_key)
);
CREATE TABLE ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL,
  FOREIGN KEY(candidate_id,election_id) REFERENCES candidates(id,election_id) ON DELETE RESTRICT
);
CREATE INDEX ballots_election_candidate ON ballots(election_id,candidate_id);
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE voting_rate_limits (
  key TEXT PRIMARY KEY, scope TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1, denied INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX voting_rate_expiry ON voting_rate_limits(expires_at);
CREATE TABLE voting_health (
  code TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION voting_freeze_profiles() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status TEXT; election UUID;
BEGIN
  IF TG_OP='DELETE' THEN election := OLD.election_id; ELSE election := NEW.election_id; END IF;
  IF TG_OP='UPDATE' AND NEW.election_id <> OLD.election_id THEN RAISE EXCEPTION 'election locked'; END IF;
  SELECT status INTO current_status FROM elections WHERE id=election FOR UPDATE;
  IF current_status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'election locked'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER candidates_frozen BEFORE INSERT OR UPDATE OR DELETE ON candidates FOR EACH ROW EXECUTE FUNCTION voting_freeze_profiles();

CREATE FUNCTION voting_freeze_voters() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status TEXT; election UUID;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.election_id <> OLD.election_id OR NEW.voter_key <> OLD.voter_key) THEN
    RAISE EXCEPTION 'election locked';
  END IF;
  IF TG_OP='DELETE' THEN election := OLD.election_id; ELSE election := NEW.election_id; END IF;
  SELECT status INTO current_status FROM elections WHERE id=election FOR UPDATE;
  IF current_status <> 'draft' THEN
    IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'election locked'; END IF;
    IF NEW.election_id <> OLD.election_id OR NEW.voter_key <> OLD.voter_key OR NEW.eligible <> OLD.eligible OR OLD.consumed OR NOT NEW.consumed THEN
      RAISE EXCEPTION 'election locked';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER voters_frozen BEFORE INSERT OR UPDATE OR DELETE ON eligible_voters FOR EACH ROW EXECUTE FUNCTION voting_freeze_voters();

CREATE FUNCTION voting_freeze_election() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND (NEW.period <> OLD.period OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.status='draft' OR (OLD.status='closed' AND NEW.status<>'closed')) THEN
    RAISE EXCEPTION 'election locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER election_frozen BEFORE UPDATE ON elections FOR EACH ROW EXECUTE FUNCTION voting_freeze_election();

CREATE FUNCTION voting_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable record'; END $$;
CREATE TRIGGER ballots_immutable BEFORE UPDATE OR DELETE ON ballots FOR EACH ROW EXECUTE FUNCTION voting_immutable();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION voting_immutable();

CREATE FUNCTION cast_hima_ballot(election UUID, voter TEXT, candidate UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE e elections%ROWTYPE; changed INTEGER;
BEGIN
  SELECT * INTO e FROM elections WHERE id=election FOR UPDATE;
  IF NOT FOUND OR e.status <> 'scheduled' OR clock_timestamp() < e.starts_at OR clock_timestamp() >= e.ends_at THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id=candidate AND election_id=election) THEN RETURN false; END IF;
  UPDATE eligible_voters SET consumed=true WHERE election_id=election AND voter_key=voter AND eligible AND NOT consumed;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RETURN false; END IF;
  INSERT INTO ballots(election_id,candidate_id) VALUES (election,candidate);
  RETURN true;
END $$;

CREATE FUNCTION voting_take_rate(bucket TEXT, bucket_scope TEXT, max_hits INTEGER) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE total INTEGER;
BEGIN
  DELETE FROM voting_rate_limits WHERE expires_at < clock_timestamp();
  INSERT INTO voting_rate_limits(key,scope,expires_at) VALUES (bucket,bucket_scope,clock_timestamp()+interval '10 minutes')
  ON CONFLICT(key) DO UPDATE SET hits=voting_rate_limits.hits+1, denied=voting_rate_limits.denied + CASE WHEN voting_rate_limits.hits >= max_hits THEN 1 ELSE 0 END
  RETURNING hits INTO total;
  RETURN total <= max_hits;
END $$;

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligible_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON elections,candidates,eligible_voters,ballots,audit_logs,voting_rate_limits,voting_health FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION cast_hima_ballot(UUID,TEXT,UUID), voting_take_rate(TEXT,TEXT,INTEGER) FROM PUBLIC,anon,authenticated;

COMMIT;
