CREATE TABLE voting_settings (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  election_id UUID UNIQUE REFERENCES elections(id) ON DELETE RESTRICT
);

INSERT INTO voting_settings(id, election_id)
VALUES ('main', (
  SELECT id FROM elections
  ORDER BY CASE WHEN status = 'scheduled' THEN 0 ELSE 1 END, period DESC, created_at DESC
  LIMIT 1
));

ALTER TABLE voting_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON voting_settings FROM PUBLIC, anon, authenticated;
