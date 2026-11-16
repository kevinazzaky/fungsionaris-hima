BEGIN;

ALTER TABLE public.elections ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0 CHECK (token_version >= 0);

CREATE TABLE public.voting_reset_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot JSONB NOT NULL
);
ALTER TABLE public.voting_reset_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voting_reset_backups FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.voting_freeze_election() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user='postgres' AND current_setting('hima.voting_reset',true) = OLD.id::text
     AND OLD.status='closed' AND NEW.status='draft' AND NEW.period=OLD.period
     AND NEW.starts_at IS NULL AND NEW.ends_at IS NULL
     AND NEW.token_version=OLD.token_version+1 THEN RETURN NEW; END IF;
  IF NEW.token_version IS DISTINCT FROM OLD.token_version THEN RAISE EXCEPTION 'election locked'; END IF;
  IF NEW.status <> 'draft' AND (NEW.starts_at IS NULL OR NEW.ends_at IS NULL OR NEW.ends_at <= NEW.starts_at) THEN
    RAISE EXCEPTION 'invalid voting window';
  END IF;
  IF OLD.status <> 'draft' THEN
    IF NEW.period IS DISTINCT FROM OLD.period OR NEW.status='draft' THEN RAISE EXCEPTION 'election locked'; END IF;
    IF (NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at)
       AND NOT (NEW.status='scheduled' AND (OLD.status='closed' OR (OLD.status='scheduled' AND OLD.ends_at <= clock_timestamp()))) THEN
      RAISE EXCEPTION 'election locked';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.voting_freeze_voters() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status TEXT; election UUID;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.election_id <> OLD.election_id OR NEW.voter_key <> OLD.voter_key) THEN RAISE EXCEPTION 'election locked'; END IF;
  IF TG_OP='DELETE' THEN election := OLD.election_id; ELSE election := NEW.election_id; END IF;
  SELECT status INTO current_status FROM public.elections WHERE id=election FOR UPDATE;
  IF current_user='postgres' AND TG_OP='UPDATE' AND current_setting('hima.voting_reset',true)=OLD.election_id::text
     AND NEW.eligible=OLD.eligible AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND OLD.consumed AND NOT NEW.consumed THEN RETURN NEW; END IF;
  IF current_status <> 'draft' THEN
    IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'election locked'; END IF;
    IF NEW.election_id <> OLD.election_id OR NEW.voter_key <> OLD.voter_key OR NEW.eligible <> OLD.eligible OR OLD.consumed OR NOT NEW.consumed THEN
      RAISE EXCEPTION 'election locked';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.voting_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user='postgres' AND TG_TABLE_NAME='ballots' AND TG_OP='DELETE' AND current_setting('hima.voting_reset',true)=OLD.election_id::text THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'immutable record';
END $$;
CREATE TRIGGER voting_reset_backups_immutable BEFORE UPDATE OR DELETE ON public.voting_reset_backups FOR EACH ROW EXECUTE FUNCTION public.voting_immutable();

CREATE FUNCTION public.cast_hima_ballot(election UUID,voter TEXT,candidate UUID,token_version_value INTEGER) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE e public.elections%ROWTYPE; changed INTEGER;
BEGIN
  SELECT * INTO e FROM public.elections WHERE id=election FOR UPDATE;
  IF NOT FOUND OR e.status <> 'scheduled' OR clock_timestamp() < e.starts_at OR clock_timestamp() >= e.ends_at
     OR e.token_version IS DISTINCT FROM token_version_value THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id=candidate AND election_id=election AND NOT placeholder) THEN RETURN false; END IF;
  UPDATE public.eligible_voters SET consumed=true WHERE election_id=election AND voter_key=voter AND eligible AND NOT consumed;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RETURN false; END IF;
  INSERT INTO public.ballots(election_id,candidate_id) VALUES(election,candidate);
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.cast_hima_ballot(election UUID,voter TEXT,candidate UUID) RETURNS BOOLEAN LANGUAGE sql AS $$
  SELECT public.cast_hima_ballot(election,voter,candidate,0)
$$;
REVOKE ALL ON FUNCTION public.cast_hima_ballot(UUID,TEXT,UUID,INTEGER) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cast_hima_ballot(UUID,TEXT,UUID) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.reset_hima_voting_test_period(target_election UUID,actor UUID,confirmation TEXT)
RETURNS TABLE(backup_id UUID,ballots_removed INTEGER,rights_restored INTEGER,audit_action TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.elections%ROWTYPE; saved UUID; removed INTEGER; restored INTEGER; reset_action TEXT; previous_context TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."AdminUser" WHERE id=actor) THEN RAISE EXCEPTION 'voting_reset_admin' USING ERRCODE='42501'; END IF;
  SELECT * INTO e FROM public.elections WHERE id=target_election FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'voting_reset_not_found' USING ERRCODE='22023'; END IF;
  IF e.status <> 'closed' THEN RAISE EXCEPTION 'voting_reset_requires_closed' USING ERRCODE='22023'; END IF;
  IF confirmation IS DISTINCT FROM 'RESET ' || e.period THEN RAISE EXCEPTION 'voting_reset_confirmation' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.ballots WHERE election_id=e.id) <> (SELECT count(*) FROM public.eligible_voters WHERE election_id=e.id AND consumed) THEN
    RAISE EXCEPTION 'voting_reset_audit_mismatch' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.voting_reset_backups(election_id,actor_id,snapshot)
  VALUES(e.id,actor,jsonb_build_object(
    'election',to_jsonb(e),
    'candidates',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM public.candidates c WHERE c.election_id=e.id),
    'voters',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) FROM public.eligible_voters v WHERE v.election_id=e.id),
    'ballots',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM public.ballots b WHERE b.election_id=e.id),
    'audit',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) FROM public.audit_logs a WHERE a.election_id=e.id)
  )) RETURNING id INTO saved;
  previous_context := current_setting('hima.voting_reset',true);
  PERFORM set_config('hima.voting_reset',e.id::text,true);
  DELETE FROM public.ballots WHERE election_id=e.id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  UPDATE public.eligible_voters SET consumed=false WHERE election_id=e.id AND consumed;
  GET DIAGNOSTICS restored = ROW_COUNT;
  UPDATE public.elections SET status='draft',starts_at=NULL,ends_at=NULL,token_version=token_version+1 WHERE id=e.id;
  PERFORM set_config('hima.voting_reset',coalesce(previous_context,''),true);
  DELETE FROM public.voting_rate_limits r WHERE EXISTS (
    SELECT 1 FROM public.eligible_voters v WHERE v.election_id=e.id
    AND r.key IN ('nim:' || v.voter_key,'cast:' || v.voter_key,'status:' || e.id::text || ':' || v.voter_key)
  );
  reset_action := 'test_period_reset_by_operator:user_requested;dummy_ballots_removed=' || removed || ';rights_restored=' || restored;
  INSERT INTO public.audit_logs(election_id,actor_id,action) VALUES(e.id,actor,reset_action);
  RETURN QUERY SELECT saved,removed,restored,reset_action;
END $$;
ALTER FUNCTION public.reset_hima_voting_test_period(UUID,UUID,TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reset_hima_voting_test_period(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
