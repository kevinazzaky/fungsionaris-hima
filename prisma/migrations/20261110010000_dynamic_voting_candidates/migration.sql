BEGIN;

ALTER TABLE candidates DROP CONSTRAINT candidates_number_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_number_check CHECK (number > 0);

CREATE OR REPLACE FUNCTION cast_hima_ballot(election UUID, voter TEXT, candidate UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE e elections%ROWTYPE; changed INTEGER;
BEGIN
  SELECT * INTO e FROM elections WHERE id=election FOR UPDATE;
  IF NOT FOUND OR e.status <> 'scheduled' OR clock_timestamp() < e.starts_at OR clock_timestamp() >= e.ends_at THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM candidates WHERE id=candidate AND election_id=election AND NOT placeholder) THEN RETURN false; END IF;
  UPDATE eligible_voters SET consumed=true WHERE election_id=election AND voter_key=voter AND eligible AND NOT consumed;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RETURN false; END IF;
  INSERT INTO ballots(election_id,candidate_id) VALUES (election,candidate);
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION cast_hima_ballot(UUID,TEXT,UUID) FROM PUBLIC,anon,authenticated;

COMMIT;
