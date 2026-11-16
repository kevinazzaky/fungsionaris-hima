ALTER TABLE eligible_voters ADD COLUMN name VARCHAR(100);

CREATE FUNCTION voting_freeze_voter_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name AND
     (SELECT status FROM elections WHERE id=OLD.election_id FOR UPDATE) <> 'draft' THEN
    RAISE EXCEPTION 'election locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER voter_name_frozen BEFORE UPDATE ON eligible_voters
FOR EACH ROW EXECUTE FUNCTION voting_freeze_voter_name();
