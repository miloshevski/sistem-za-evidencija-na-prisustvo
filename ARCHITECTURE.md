# System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────┬───────────────────────────────────────────┤
│  PROFESSOR CLIENT   │         STUDENT CLIENT                    │
│  (Desktop/Mobile)   │         (Mobile)                          │
│                     │                                            │
│  • Login Page       │  • Main Page (Scan Interface)             │
│  • Dashboard        │  • No Authentication                      │
│  • Session View     │  • Camera Access                          │
│  • QR Display       │  • GPS Access                             │
│  • Manual Override  │  • localStorage (device_id)               │
└─────────────────────┴───────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER (Vercel)                     │
├─────────────────────────────────────────────────────────────────┤
│                         API ROUTES                               │
│                                                                  │
│  Authentication          Session Management                      │
│  ├─ /api/auth/login     ├─ /api/sessions/start                 │
│  └─ /api/auth/verify    ├─ /api/sessions/end                   │
│                         ├─ /api/sessions/[id]/qr-token          │
│                         └─ /api/sessions/[id]/scans             │
│                                                                  │
│  Scan Processing                                                 │
│  ├─ /api/scans/submit    (9 validation checks)                 │
│  └─ /api/scans/manual-override                                  │
│                                                                  │
│                      UTILITY LIBRARIES                           │
│  ├─ auth.ts (JWT, bcrypt)                                       │
│  ├─ gps.ts (Haversine formula)                                  │
│  ├─ crypto.ts (tokens, nonces)                                  │
│  └─ deviceId.ts (UUID management)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────┤
│  TABLES                                                          │
│  ├─ professors (auth)                                            │
│  ├─ sessions (active sessions)                                   │
│  ├─ scans_valid (attendance records)                            │
│  ├─ scans_invalid (failed attempts + reasons)                   │
│  ├─ qr_tokens (rotating tokens)                                 │
│  └─ used_server_nonces (replay protection)                      │
│                                                                  │
│  FEATURES                                                        │
│  ├─ Row Level Security (RLS)                                    │
│  ├─ Database Functions (calculate_distance)                     │
│  ├─ Indexes for Performance                                     │
│  └─ Foreign Key Constraints                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1. Professor Session Flow

```
Professor → Login Page
    ↓
    POST /api/auth/login
    ↓
    Server validates email/password (bcrypt)
    ↓
    Generate JWT token
    ↓
    Return token + professor info
    ↓
Professor → Dashboard
    ↓
    Click "Start Session"
    ↓
    Browser requests GPS
    ↓
    POST /api/sessions/start
    {prof_lat, prof_lon}
    ↓
    Server creates session record
    session_id = UUID
    prof_lat, prof_lon (FIXED for session)
    is_active = true
    ↓
    Return session_id
    ↓
Professor → Session Page /professor/session/[id]
    ↓
    QR Display component starts
    ↓
    Every 5 seconds:
        GET /api/sessions/[id]/qr-token
        ↓
        Server generates:
          - token = timestamp:hash
          - server_nonce = random
          - expires_at = now + 10s
        ↓
        Store in qr_tokens table
        ↓
        Return qr_data = JSON({
          session_id,
          token,
          server_nonce,
          timestamp
        })
        ↓
        Generate QR code image
        ↓
        Display to students

    Every 3 seconds:
        GET /api/sessions/[id]/scans
        ↓
        Fetch valid_scans and invalid_scans
        ↓
        Update UI tables
```

### 2. Student Scan Flow

```
Student → Homepage (/)
    ↓
    Enter: index, name, surname
    ↓
    Click "Continue"
    ↓
    Browser requests GPS permission
    ↓
    Capture GPS coordinates
    {lat, lon, timestamp}
    ↓
    Generate/Get device_id from localStorage
    device_id = UUID (persistent)
    ↓
    Generate client_nonce = UUID
    ↓
    Store all data in memory:
    {
      student_index,
      name,
      surname,
      client_lat,
      client_lon,
      client_ts,
      device_id,
      client_nonce,
      app_version
    }
    ↓
Student → QR Scanner activates
    ↓
    Point camera at professor's QR
    ↓
    QR code scanned, parse JSON:
    {session_id, token, server_nonce, timestamp}
    ↓
    POST /api/scans/submit
    {
      session_id,
      token,
      server_nonce,
      student_index,
      name,
      surname,
      client_lat,
      client_lon,
      client_ts,
      device_id,
      client_nonce,
      app_version
    }
    ↓
    SERVER VALIDATION (9 checks):
    ├─ 1. All fields present?
    ├─ 2. GPS coords valid format?
    ├─ 3. Session exists and active?
    ├─ 4. Device not already scanned? (DB check)
    ├─ 5. Token format valid?
    ├─ 6. Token in database and not expired?
    ├─ 7. Server nonce not used?
    ├─ 8. Timestamp within tolerance?
    └─ 9. GPS distance < 50m? (Haversine)
    ↓
    ALL PASS?
    ├─ YES → INSERT into scans_valid
    │         INSERT into used_server_nonces
    │         Return {valid: true, distance_m}
    │
    └─ NO  → INSERT into scans_invalid + reason
              Return {valid: false, reason}
    ↓
Student → Result page
    ↓
    Show success or failure with message
```

### 3. Validation Process (Detailed)

```
POST /api/scans/submit receives data
    ↓
┌───────────────────────────────────────────┐
│         VALIDATION PIPELINE               │
├───────────────────────────────────────────┤
│                                           │
│ [1] Required Fields Check                 │
│     ↓ FAIL → 400 error                    │
│     ↓ PASS                                │
│                                           │
│ [2] GPS Format Validation                 │
│     isValidGPS(lat, lon)                  │
│     ↓ FAIL → log invalid + return         │
│     ↓ PASS                                │
│                                           │
│ [3] Session Active Check                  │
│     SELECT * FROM sessions                │
│     WHERE session_id = ? AND is_active = true │
│     ↓ FAIL → log invalid + return         │
│     ↓ PASS                                │
│                                           │
│ [4] Device Constraint Check               │
│     SELECT * FROM scans_valid             │
│     WHERE session_id = ? AND device_id = ? │
│     ↓ EXISTS → log invalid + return       │
│     ↓ NOT EXISTS                          │
│                                           │
│ [5] Token Format Check                    │
│     validateQRTokenFormat(token, 10s)     │
│     ↓ FAIL → log invalid + return         │
│     ↓ PASS                                │
│                                           │
│ [6] Token Database Check                  │
│     SELECT * FROM qr_tokens               │
│     WHERE token = ? AND expires_at > NOW() │
│     ↓ NOT FOUND → log invalid + return    │
│     ↓ FOUND                               │
│                                           │
│ [7] Nonce Single-Use Check                │
│     SELECT * FROM used_server_nonces      │
│     WHERE server_nonce = ?                │
│     ↓ EXISTS → log invalid + return       │
│     ↓ NOT EXISTS                          │
│                                           │
│ [8] Timestamp Validation                  │
│     |client_ts - server_ts| < 10s         │
│     ↓ FAIL → log invalid + return         │
│     ↓ PASS                                │
│                                           │
│ [9] GPS Distance Check                    │
│     distance = calculateDistance(         │
│       prof_lat, prof_lon,                 │
│       client_lat, client_lon)             │
│     distance < 50m?                       │
│     ↓ FAIL → log invalid + return         │
│     ↓ PASS                                │
│                                           │
│ ✅ ALL CHECKS PASSED                      │
│                                           │
│ INSERT INTO scans_valid (...)             │
│ INSERT INTO used_server_nonces (...)      │
│                                           │
│ RETURN {valid: true, distance_m}          │
└───────────────────────────────────────────┘
```

## 🔐 Security Architecture

### Authentication Layer

```
┌─────────────────────────────────────────┐
│         PROFESSOR LOGIN                  │
├─────────────────────────────────────────┤
│                                          │
│  POST /api/auth/login                    │
│  {email, password}                       │
│         ↓                                │
│  [1] Query professor by email            │
│  [2] bcrypt.compare(password, hash)      │
│         ↓ FAIL → 401                     │
│         ↓ PASS                           │
│  [3] Generate JWT token                  │
│      - Algorithm: HS256                  │
│      - Expiry: 24 hours                  │
│      - Payload: {professorId, email, name} │
│         ↓                                │
│  RETURN {token, professor}               │
│         ↓                                │
│  Store in localStorage                   │
│                                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      AUTHENTICATED REQUESTS              │
├─────────────────────────────────────────┤
│                                          │
│  Every protected API request:            │
│                                          │
│  Authorization: Bearer <token>           │
│         ↓                                │
│  Extract token from header               │
│         ↓                                │
│  jwtVerify(token, JWT_SECRET)            │
│         ↓ INVALID → 401                  │
│         ↓ VALID                          │
│  Extract professorId from payload        │
│         ↓                                │
│  Query professor from database           │
│         ↓ NOT FOUND → 401                │
│         ↓ FOUND                          │
│  Proceed with request                    │
│                                          │
└─────────────────────────────────────────┘
```

### Token Security

```
┌─────────────────────────────────────────┐
│       QR TOKEN GENERATION                │
├─────────────────────────────────────────┤
│                                          │
│  timestamp = Date.now()                  │
│  data = session_id:timestamp:nonce       │
│  hash = HMAC-SHA256(data, JWT_SECRET)    │
│  token = timestamp:hash                  │
│         ↓                                │
│  server_nonce = crypto.randomBytes(32)   │
│         ↓                                │
│  expires_at = timestamp + 10000ms        │
│         ↓                                │
│  INSERT qr_tokens {                      │
│    session_id,                           │
│    token,                                │
│    expires_at                            │
│  }                                       │
│         ↓                                │
│  RETURN {                                │
│    qr_data: JSON({                       │
│      session_id,                         │
│      token,                              │
│      server_nonce,                       │
│      timestamp                           │
│    })                                    │
│  }                                       │
│                                          │
└─────────────────────────────────────────┘
```

### Anti-Replay Protection

```
┌─────────────────────────────────────────┐
│       REPLAY ATTACK PREVENTION           │
├─────────────────────────────────────────┤
│                                          │
│  [A] QR Token Rotation (5 seconds)       │
│      - New token every 5s                │
│      - Old tokens expire in 10s          │
│      - Screenshot useless after 10s      │
│                                          │
│  [B] Server Nonce Single-Use             │
│      - Each QR has unique server_nonce   │
│      - Nonce inserted to used_server_nonces │
│      - Duplicate nonce → REJECTED        │
│                                          │
│  [C] Device Fingerprinting               │
│      - UUID stored in localStorage       │
│      - UNIQUE(session_id, device_id)     │
│      - Same device can't scan twice      │
│                                          │
│  [D] Timestamp Validation                │
│      - Client must be time-synced        │
│      - Reject if |Δt| > 10 seconds       │
│                                          │
└─────────────────────────────────────────┘
```

## 📊 Database Architecture

### Entity Relationship Diagram

```
┌─────────────────┐
│   professors    │
├─────────────────┤
│ id (PK)         │──┐
│ name            │  │
│ email (UNIQUE)  │  │
│ password_hash   │  │
└─────────────────┘  │
                     │ 1:N
                     │
┌─────────────────┐  │
│    sessions     │◄─┘
├─────────────────┤
│ session_id (PK) │──┬─────────────────────┐
│ professor_id(FK)│  │                     │
│ start_ts        │  │                     │
│ end_ts          │  │                     │
│ prof_lat        │  │                     │
│ prof_lon        │  │                     │
│ is_active       │  │                     │
└─────────────────┘  │                     │
                     │ 1:N                 │ 1:N
                     │                     │
         ┌───────────┴──────────┬─────────┴──────────┐
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────┐    ┌─────────────────┐  ┌──────────────────┐
│  scans_valid    │    │  scans_invalid  │  │    qr_tokens     │
├─────────────────┤    ├─────────────────┤  ├──────────────────┤
│ id (PK)         │    │ id (PK)         │  │ id (PK)          │
│ session_id (FK) │    │ session_id (FK) │  │ session_id (FK)  │
│ student_index   │    │ student_index   │  │ token (UNIQUE)   │
│ name            │    │ name            │  │ created_at       │
│ surname         │    │ surname         │  │ expires_at       │
│ client_lat      │    │ client_lat      │  └──────────────────┘
│ client_lon      │    │ client_lon      │
│ client_ts       │    │ client_ts       │  ┌──────────────────┐
│ scanned_at_srv  │    │ scanned_at_srv  │  │used_server_nonces│
│ distance_m      │    │ distance_m      │  ├──────────────────┤
│ device_id       │    │ device_id       │  │ server_nonce(PK) │
│ server_nonce    │    │ server_nonce    │  │ session_id (FK)  │
│ client_nonce    │    │ client_nonce    │  │ created_at       │
│ app_version     │    │ app_version     │  └──────────────────┘
│                 │    │ reason ⚠️       │           ▲
│                 │    │ qr_token        │           │
└─────────────────┘    └─────────────────┘           │
         │                                            │
         │ UNIQUE(session_id, device_id)             │
         └───────────────────────────────────────────┘
                        REFERENCES
```

### Index Strategy

```
INDEXES FOR PERFORMANCE:

professors
  ├─ PRIMARY KEY (id)
  └─ idx_professors_email (email) ← LOGIN LOOKUPS

sessions
  ├─ PRIMARY KEY (session_id)
  ├─ idx_sessions_professor_active (professor_id, is_active)
  └─ idx_sessions_active (is_active) WHERE is_active

scans_valid
  ├─ PRIMARY KEY (id)
  ├─ idx_scans_valid_device_session (session_id, device_id) ← UNIQUE
  ├─ idx_scans_valid_session (session_id) ← FETCH SCANS
  ├─ idx_scans_valid_student (student_index) ← STUDENT HISTORY
  └─ idx_scans_valid_server_nonce (server_nonce)

scans_invalid
  ├─ PRIMARY KEY (id)
  ├─ idx_scans_invalid_session (session_id)
  ├─ idx_scans_invalid_reason (reason) ← ANALYTICS
  └─ idx_scans_invalid_device (device_id)

qr_tokens
  ├─ PRIMARY KEY (id)
  ├─ idx_qr_tokens_token (token) ← VALIDATION
  ├─ idx_qr_tokens_session (session_id)
  └─ idx_qr_tokens_expires (expires_at) ← CLEANUP

used_server_nonces
  ├─ PRIMARY KEY (server_nonce)
  ├─ idx_used_nonces_session (session_id)
  └─ idx_used_nonces_created (created_at) ← CLEANUP
```

## 🔄 State Management

### Client-Side State

```
PROFESSOR CLIENT:
┌──────────────────────────────┐
│ localStorage                 │
├──────────────────────────────┤
│ • professor_token (JWT)      │
│ • professor (JSON)           │
│ • active_session (JSON)      │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ React State (Session Page)   │
├──────────────────────────────┤
│ • session (object)           │
│ • validScans (array)         │
│ • invalidScans (array)       │
│ • loading (boolean)          │
│ • ending (boolean)           │
└──────────────────────────────┘

STUDENT CLIENT:
┌──────────────────────────────┐
│ localStorage                 │
├──────────────────────────────┤
│ • attendance_device_id (UUID)│ ← PERSISTENT
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ React State (Main Page)      │
├──────────────────────────────┤
│ • step (enum)                │
│ • studentData (object)       │
│ • gpsData (object)           │
│ • deviceId (string)          │
│ • clientNonce (string)       │
│ • result (object)            │
└──────────────────────────────┘
```

## 🚀 Deployment Architecture

### Production Stack (Vercel + Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│                     USER DEVICES                             │
│  • Professors (Desktop/Mobile)                               │
│  • Students (Mobile)                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                  VERCEL EDGE NETWORK                         │
│  • Global CDN                                                │
│  • Automatic HTTPS                                           │
│  • DDoS Protection                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS APP (Vercel Serverless)                │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │         Static Pages (Pre-rendered)          │           │
│  │  • Login page                                │           │
│  │  • Dashboard                                 │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │    Serverless Functions (API Routes)         │           │
│  │  • /api/auth/*                               │           │
│  │  • /api/sessions/*                           │           │
│  │  • /api/scans/*                              │           │
│  │  Auto-scaling, 0→∞ instances                 │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  Environment Variables (Encrypted):                         │
│  • JWT_SECRET                                               │
│  • SUPABASE_SERVICE_ROLE_KEY                                │
└─────────────────────────────────────────────────────────────┘
                          ↓ PostgreSQL Wire Protocol
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                            │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │          PostgreSQL Database                 │           │
│  │  • Connection pooling                        │           │
│  │  • Automatic backups                         │           │
│  │  • Point-in-time recovery                    │           │
│  │  • Row Level Security                        │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │              RESTful API                     │           │
│  │  • Auto-generated from schema                │           │
│  │  • Real-time subscriptions                   │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │            Dashboard & Tools                 │           │
│  │  • SQL Editor                                │           │
│  │  • Table Editor                              │           │
│  │  • Logs & Monitoring                         │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 📈 Scalability Considerations

### Horizontal Scaling

```
CURRENT: Single Region
┌─────────────┐
│   Vercel    │ ← Auto-scales serverless functions
│   (US)      │    0 → ∞ instances based on load
└─────────────┘
      │
      ▼
┌─────────────┐
│  Supabase   │ ← Connection pooling
│   (US)      │    Handles 1000+ concurrent connections
└─────────────┘

FUTURE: Multi-Region (if needed)
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Vercel    │   │   Vercel    │   │   Vercel    │
│   (US)      │   │   (EU)      │   │   (ASIA)    │
└─────────────┘   └─────────────┘   └─────────────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                 ┌─────────────┐
                 │  Supabase   │ ← Read replicas
                 │  (Primary)  │    can be added
                 └─────────────┘
```

### Performance Optimization

```
DATABASE LEVEL:
• Indexes on all foreign keys
• UNIQUE index enforces device constraint (no app-level check needed)
• Connection pooling prevents connection exhaustion
• Prepared statements (Supabase handles this)

API LEVEL:
• Minimal database queries per request
• No N+1 queries
• Efficient validation pipeline (fail-fast)
• Stateless design (JWT tokens)

CLIENT LEVEL:
• QR code generated client-side (reduced server load)
• Polling interval: 3s (balance between real-time and load)
• Optimistic UI updates
• Lazy loading of components
```

## 🔍 Monitoring & Observability

### Key Metrics to Track

```
┌─────────────────────────────────────┐
│        APPLICATION METRICS          │
├─────────────────────────────────────┤
│ • Sessions created/hour             │
│ • Scans processed/minute            │
│ • Valid scan rate (%)               │
│ • Invalid scan reasons (breakdown)  │
│ • Average response time             │
│ • Error rate                        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         DATABASE METRICS            │
├─────────────────────────────────────┤
│ • Query performance                 │
│ • Connection pool usage             │
│ • Table sizes                       │
│ • Index efficiency                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          SECURITY METRICS           │
├─────────────────────────────────────┤
│ • Failed login attempts             │
│ • Duplicate scan attempts           │
│ • Invalid token rate                │
│ • Replay attack attempts            │
└─────────────────────────────────────┘
```

---

This architecture is designed for:
✅ **Security**: Multiple validation layers, encrypted tokens
✅ **Scalability**: Serverless auto-scaling, indexed database
✅ **Reliability**: Foreign keys, constraints, error handling
✅ **Performance**: Optimized queries, efficient validation
✅ **Maintainability**: Clear separation of concerns, documented
