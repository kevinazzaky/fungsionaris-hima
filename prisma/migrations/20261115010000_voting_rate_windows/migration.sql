CREATE FUNCTION voting_take_rate(bucket TEXT, bucket_scope TEXT, max_hits INTEGER, window_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE total INTEGER;
BEGIN
  IF window_seconds NOT IN (300,600) OR max_hits < 1 THEN
    RAISE EXCEPTION 'invalid rate limit';
  END IF;
  DELETE FROM voting_rate_limits WHERE expires_at < clock_timestamp();
  INSERT INTO voting_rate_limits(key,scope,expires_at)
  VALUES (bucket,bucket_scope,clock_timestamp()+make_interval(secs => window_seconds))
  ON CONFLICT(key) DO UPDATE
  SET hits=voting_rate_limits.hits+1,
      denied=voting_rate_limits.denied + CASE WHEN voting_rate_limits.hits >= max_hits THEN 1 ELSE 0 END
  RETURNING hits INTO total;
  RETURN total <= max_hits;
END $$;
REVOKE ALL ON FUNCTION voting_take_rate(TEXT,TEXT,INTEGER,INTEGER) FROM PUBLIC,anon,authenticated;
