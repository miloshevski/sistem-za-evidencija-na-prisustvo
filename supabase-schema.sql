-- ============================================
-- CLASS ATTENDANCE SYSTEM - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFESSORS TABLE
-- ============================================
CREATE TABLE professors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups during login
CREATE INDEX idx_professors_email ON professors(email);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
    start_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_ts TIMESTAMP WITH TIME ZONE,
    prof_lat DECIMAL(10, 8) NOT NULL,
    prof_lon DECIMAL(11, 8) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups of active sessions
CREATE INDEX idx_sessions_professor_active ON sessions(professor_id, is_active);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = true;

-- ============================================
-- VALID SCANS TABLE
-- ============================================
CREATE TABLE scans_valid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    student_index VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    client_lat DECIMAL(10, 8) NOT NULL,
    client_lon DECIMAL(11, 8) NOT NULL,
    client_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    scanned_at_server TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    distance_m DECIMAL(10, 2) NOT NULL,
    device_id UUID NOT NULL,
    server_nonce VARCHAR(255) NOT NULL,
    client_nonce VARCHAR(255) NOT NULL,
    app_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Enforce one valid scan per device per session
CREATE UNIQUE INDEX idx_scans_valid_device_session ON scans_valid(session_id, device_id);

-- Indexes for faster queries
CREATE INDEX idx_scans_valid_session ON scans_valid(session_id);
CREATE INDEX idx_scans_valid_student ON scans_valid(student_index);
CREATE INDEX idx_scans_valid_server_nonce ON scans_valid(server_nonce);

-- ============================================
-- INVALID SCANS TABLE
-- ============================================
CREATE TABLE scans_invalid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    student_index VARCHAR(50),
    name VARCHAR(255),
    surname VARCHAR(255),
    client_lat DECIMAL(10, 8),
    client_lon DECIMAL(11, 8),
    client_ts TIMESTAMP WITH TIME ZONE,
    scanned_at_server TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    distance_m DECIMAL(10, 2),
    device_id UUID,
    server_nonce VARCHAR(255),
    client_nonce VARCHAR(255),
    app_version VARCHAR(50),
    reason TEXT NOT NULL,
    qr_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analyzing invalid scans
CREATE INDEX idx_scans_invalid_session ON scans_invalid(session_id);
CREATE INDEX idx_scans_invalid_reason ON scans_invalid(reason);
CREATE INDEX idx_scans_invalid_device ON scans_invalid(device_id);

-- ============================================
-- USED SERVER NONCES TABLE
-- ============================================
CREATE TABLE used_server_nonces (
    server_nonce VARCHAR(255) PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster nonce lookup
CREATE INDEX idx_used_nonces_session ON used_server_nonces(session_id);

-- Auto-cleanup old nonces (older than 24 hours) - optional
-- This can be run as a cron job or scheduled function
CREATE INDEX idx_used_nonces_created ON used_server_nonces(created_at);

-- ============================================
-- QR TOKENS TABLE (for rotating tokens)
-- ============================================
CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast token validation
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_session ON qr_tokens(session_id);
CREATE INDEX idx_qr_tokens_expires ON qr_tokens(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate distance between two GPS coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000; -- Earth's radius in meters
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);

    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);

    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to automatically cleanup expired QR tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM qr_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to end a session
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE sessions
    SET end_ts = NOW(), is_active = false
    WHERE session_id = p_session_id;

    -- Cleanup tokens for this session
    DELETE FROM qr_tokens WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended
-- ============================================

-- Enable RLS on all tables
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans_valid ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans_invalid ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_server_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create appropriate policies based on your auth setup
-- Example policies (adjust based on your Supabase auth configuration):

-- Professors can only see their own data
CREATE POLICY professors_select_own ON professors
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Sessions: professors can see their own sessions
CREATE POLICY sessions_select_own ON sessions
    FOR SELECT
    USING (auth.uid()::text = professor_id::text);

CREATE POLICY sessions_insert_own ON sessions
    FOR INSERT
    WITH CHECK (auth.uid()::text = professor_id::text);

CREATE POLICY sessions_update_own ON sessions
    FOR UPDATE
    USING (auth.uid()::text = professor_id::text);

-- Scans: professors can see scans for their sessions
CREATE POLICY scans_valid_select_professor ON scans_valid
    FOR SELECT
    USING (
        session_id IN (
            SELECT session_id FROM sessions WHERE professor_id::text = auth.uid()::text
        )
    );

CREATE POLICY scans_invalid_select_professor ON scans_invalid
    FOR SELECT
    USING (
        session_id IN (
            SELECT session_id FROM sessions WHERE professor_id::text = auth.uid()::text
        )
    );

-- Allow service role to do everything (for API routes)
-- Service role bypasses RLS by default in Supabase

-- ============================================
-- SAMPLE DATA (optional - for testing)
-- ============================================

-- Insert a sample professor (password: 'password123')
-- Note: In production, use proper password hashing via your API
INSERT INTO professors (name, email, password_hash) VALUES
    ('Dr. John Doe', 'john.doe@university.edu', '$2a$10$rXGvPXvEVzK9zJKmF5J3qO7KZjYvZ7dJFH8BZvD3xW2XwGJN5YM8u');

-- Note: The password hash above is bcrypt for 'password123'
-- In production, generate this via your authentication system

-- ============================================
-- CLEANUP SCRIPT (run periodically)
-- ============================================

-- Clean up old nonces (older than 24 hours)
-- CREATE OR REPLACE FUNCTION cleanup_old_nonces()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM used_server_nonces WHERE created_at < NOW() - INTERVAL '24 hours';
-- END;
-- $$ LANGUAGE plpgsql;

-- You can schedule this with pg_cron or run it via a Supabase Edge Function

-- ============================================
-- USEFUL QUERIES FOR PROFESSORS
-- ============================================

-- View all valid scans for a session
-- SELECT * FROM scans_valid WHERE session_id = '<session_id>' ORDER BY scanned_at_server;

-- View all invalid scans for a session with reasons
-- SELECT student_index, name, surname, reason, scanned_at_server
-- FROM scans_invalid
-- WHERE session_id = '<session_id>'
-- ORDER BY scanned_at_server;

-- Count valid vs invalid scans for a session
-- SELECT
--     (SELECT COUNT(*) FROM scans_valid WHERE session_id = '<session_id>') as valid_count,
--     (SELECT COUNT(*) FROM scans_invalid WHERE session_id = '<session_id>') as invalid_count;

-- View session statistics
-- SELECT
--     s.session_id,
--     s.start_ts,
--     s.end_ts,
--     COUNT(DISTINCT sv.id) as valid_scans,
--     COUNT(DISTINCT si.id) as invalid_scans
-- FROM sessions s
-- LEFT JOIN scans_valid sv ON s.session_id = sv.session_id
-- LEFT JOIN scans_invalid si ON s.session_id = si.session_id
-- WHERE s.professor_id = '<professor_id>'
-- GROUP BY s.session_id, s.start_ts, s.end_ts
-- ORDER BY s.start_ts DESC;
