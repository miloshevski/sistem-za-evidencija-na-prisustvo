# Class Attendance System - Setup Guide

This is a complete QR code-based class attendance system built with Next.js and Supabase.

## Features

- ✅ Professor authentication with JWT
- ✅ Session management with rotating QR codes (every 5 seconds)
- ✅ GPS-based validation (50m radius)
- ✅ Device ID constraint (one valid scan per device per session)
- ✅ Timestamp validation
- ✅ Server nonce single-use validation
- ✅ Real-time scan monitoring
- ✅ Manual attendance override for professors
- ✅ Comprehensive invalid scan tracking with reasons

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git (optional)

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `class-attendance`
   - Database password: (create a strong password)
   - Region: (choose closest to you)
4. Wait for project to finish setting up (2-3 minutes)

### 1.2 Run the SQL Script

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New query"
3. Open the file `supabase-schema.sql` from this project
4. Copy all the SQL code
5. Paste it into the SQL Editor
6. Click "Run" or press `Ctrl+Enter`
7. You should see "Success. No rows returned" - this is correct!

### 1.3 Get Your Supabase Credentials

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. You'll need these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - click "Reveal" to show it)

⚠️ **IMPORTANT**: The `service_role` key is sensitive. Never commit it to Git or share it publicly!

### 1.4 Create a Test Professor Account

1. In Supabase SQL Editor, run this query to create a test professor:

```sql
INSERT INTO professors (name, email, password_hash)
VALUES (
  'Dr. Test Professor',
  'professor@test.com',
  '$2a$10$rXGvPXvEVzK9zJKmF5J3qO7KZjYvZ7dJFH8BZvD3xW2XwGJN5YM8u'
);
```

This creates a professor with:
- Email: `professor@test.com`
- Password: `password123`

⚠️ **Change this password in production!**

## Step 2: Project Setup

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Configure Environment Variables

1. Create a file named `.env.local` in the project root
2. Copy the content from `.env.local.example`
3. Fill in your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (generate a random string)
JWT_SECRET=change_this_to_a_random_string_min_32_characters

# App Configuration (you can keep these as-is)
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_GPS_TOLERANCE_METERS=50
NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS=10
NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS=5
```

**To generate a secure JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use an online generator:
# https://generate-secret.vercel.app/32
```

### 2.3 Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## Step 3: Testing the System

### 3.1 Professor Workflow

1. Open `http://localhost:3000/professor/login`
2. Login with:
   - Email: `professor@test.com`
   - Password: `password123`
3. Click "Start New Session"
   - Allow location permissions when prompted
4. You'll see a QR code that rotates every 5 seconds
5. Keep this page open on your device

### 3.2 Student Workflow

1. Open `http://localhost:3000` on a **different device or browser**
   - Must be a real mobile device or emulator with camera access
2. Enter student information:
   - Student Index: `2024/0001`
   - First Name: `John`
   - Last Name: `Doe`
3. Click "Continue to QR Scan"
   - Allow location and camera permissions
4. Point camera at the professor's QR code
5. The scan will be automatically processed

### 3.3 What Gets Validated

The system checks:
1. ✅ QR token is valid and not expired (10 second window)
2. ✅ Server nonce hasn't been used before (prevents replay attacks)
3. ✅ Student's GPS is within 50m of professor
4. ✅ Client timestamp is within 10s of server time
5. ✅ Device hasn't already submitted a valid scan for this session
6. ✅ Session is still active

If any check fails, the scan is logged to `scans_invalid` with a reason.

## Step 4: Production Deployment

### 4.1 Deploy to Vercel (Recommended)

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore`)
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add all environment variables from `.env.local`
6. Click "Deploy"

### 4.2 Security Considerations

Before going to production:

1. **Change the default professor password:**
```sql
-- In Supabase SQL Editor, update the password hash
-- First, generate a new hash using bcrypt with cost 10
-- Then update:
UPDATE professors
SET password_hash = 'new_bcrypt_hash_here'
WHERE email = 'professor@test.com';
```

2. **Create real professor accounts** via your own registration system (not included in this basic version)

3. **Enable Row Level Security (RLS)** in Supabase:
   - The SQL script already sets up basic RLS policies
   - Review and adjust them based on your needs

4. **Use HTTPS only** - Vercel provides this automatically

5. **Set up proper CORS** if needed for your domain

## Step 5: Database Management

### View All Sessions

```sql
SELECT
  s.session_id,
  p.name as professor_name,
  s.start_ts,
  s.end_ts,
  s.is_active,
  COUNT(DISTINCT sv.id) as valid_scans,
  COUNT(DISTINCT si.id) as invalid_scans
FROM sessions s
LEFT JOIN professors p ON s.professor_id = p.id
LEFT JOIN scans_valid sv ON s.session_id = sv.session_id
LEFT JOIN scans_invalid si ON s.session_id = si.session_id
GROUP BY s.session_id, p.name, s.start_ts, s.end_ts, s.is_active
ORDER BY s.start_ts DESC;
```

### Export Attendance for a Session

```sql
SELECT
  student_index,
  name,
  surname,
  scanned_at_server,
  distance_m,
  CASE
    WHEN app_version = 'manual-override' THEN 'Manual'
    ELSE 'QR Scan'
  END as method
FROM scans_valid
WHERE session_id = 'your-session-id-here'
ORDER BY scanned_at_server;
```

### View Invalid Scans with Reasons

```sql
SELECT
  student_index,
  name,
  surname,
  reason,
  scanned_at_server,
  distance_m
FROM scans_invalid
WHERE session_id = 'your-session-id-here'
ORDER BY scanned_at_server DESC;
```

### Cleanup Old Data (run periodically)

```sql
-- Delete old nonces (older than 24 hours)
DELETE FROM used_server_nonces
WHERE created_at < NOW() - INTERVAL '24 hours';

-- Delete expired tokens
DELETE FROM qr_tokens
WHERE expires_at < NOW();
```

## Troubleshooting

### "Failed to get GPS location"
- Student needs to allow location permissions in browser
- Must use HTTPS in production (HTTP only works on localhost)
- Some browsers block geolocation on non-secure connections

### "Invalid or expired QR token"
- QR codes expire after 10 seconds
- Make sure student device time is synchronized
- Check `NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS` setting

### "Device has already submitted a valid scan"
- Each device (identified by UUID) can only scan once per session
- This is intentional to prevent duplicate attendance
- Professor can use "Manual Override" if needed
- To test multiple times, clear browser localStorage

### "Distance exceeds maximum"
- Student is too far from professor (>50m)
- Check GPS accuracy on both devices
- Adjust `NEXT_PUBLIC_GPS_TOLERANCE_METERS` if needed

### QR Scanner not working
- Browser needs camera permissions
- Works best on mobile devices
- Desktop testing: use browser DevTools mobile emulation

## Configuration Options

Edit these in `.env.local`:

```env
# Maximum distance allowed (in meters)
NEXT_PUBLIC_GPS_TOLERANCE_METERS=50

# Time tolerance for timestamp validation (in seconds)
NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS=10

# How often QR codes rotate (in seconds)
NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS=5
```

## Architecture Overview

### Frontend
- **Next.js 15** with App Router
- **React** for UI components
- **TailwindCSS** for styling
- **qrcode** library for QR generation
- **@zxing/library** for QR scanning

### Backend (Next.js API Routes)
- `/api/auth/login` - Professor authentication
- `/api/auth/verify` - Token verification
- `/api/sessions/start` - Start attendance session
- `/api/sessions/end` - End session
- `/api/sessions/[id]/qr-token` - Get rotating QR token
- `/api/sessions/[id]/scans` - Get all scans for session
- `/api/scans/submit` - Submit student scan (with all validations)
- `/api/scans/manual-override` - Professor manual override

### Database (Supabase/PostgreSQL)
- `professors` - Professor accounts
- `sessions` - Attendance sessions
- `scans_valid` - Valid attendance records
- `scans_invalid` - Invalid scans with reasons
- `qr_tokens` - Active QR tokens
- `used_server_nonces` - Used nonces (prevent replay)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the SQL queries in `supabase-schema.sql`
3. Check browser console for error messages
4. Verify all environment variables are set correctly

## License

This project is provided as-is for educational purposes.
