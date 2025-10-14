
CREATE TABLE IF NOT EXISTS archived_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  student_index VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  client_lat DECIMAL(10, 8) NOT NULL,
  client_lon DECIMAL(11, 8) NOT NULL,
  client_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  scanned_at_server TIMESTAMP WITH TIME ZONE NOT NULL,
  distance_m DECIMAL(8, 2) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  server_nonce VARCHAR(255) NOT NULL,
  client_nonce VARCHAR(255) NOT NULL,
  app_version VARCHAR(50),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_scans_session_id ON archived_scans(session_id);

CREATE INDEX IF NOT EXISTS idx_archived_scans_student_index ON archived_scans(student_index);

CREATE INDEX IF NOT EXISTS idx_archived_scans_archived_at ON archived_scans(archived_at);

COMMENT ON TABLE archived_scans IS 'Stores all valid scans from ended sessions for historical record keeping and reporting';

ALTER TABLE archived_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can view archived scans from their sessions"
  ON archived_scans
  FOR SELECT
  USING (
    session_id IN (
      SELECT session_id
      FROM sessions
      WHERE professor_id = auth.uid()
    )
  );
