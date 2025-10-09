# Class Attendance System with QR Code Scanning

A complete, production-ready attendance tracking system using QR codes, GPS validation, and device fingerprinting.

## 🎯 Overview

This system allows professors to take attendance by generating rotating QR codes that students scan with their mobile devices. The system validates attendance using multiple security layers including GPS location, device identification, and cryptographic tokens.

## ✨ Key Features

### For Professors
- 🔐 Secure login with JWT authentication
- 📍 Session creation with GPS location capture
- 🔄 Auto-rotating QR codes (every 5 seconds)
- 📊 Real-time monitoring of valid/invalid scans
- ✏️ Manual attendance override capability
- 📈 Live statistics and scan history
- 🚫 Automatic session management

### For Students
- 📱 Simple mobile-first interface
- 📸 Camera-based QR code scanning
- 📍 Automatic GPS verification
- ✅ Instant feedback on scan success/failure
- 🔒 Privacy-focused (no login required)

### Security & Validation
- ✅ **GPS Validation**: Student must be within 50m of professor
- ✅ **Device Constraint**: One valid scan per device per session
- ✅ **Timestamp Validation**: Client/server time sync check (10s tolerance)
- ✅ **Token Rotation**: QR codes expire after 10 seconds
- ✅ **Replay Protection**: Server nonce prevents reuse
- ✅ **Session Validation**: Active session check
- ✅ **Comprehensive Logging**: All invalid scans logged with reasons

## 🏗️ Technology Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **TailwindCSS 4**

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL database)
- **JWT** (jose library)
- **bcrypt** (password hashing)

### Libraries
- **qrcode** - QR code generation
- **@zxing/library** - QR code scanning
- **uuid** - Device ID generation
- **crypto** - Token and nonce generation

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Student scanning page
│   │   ├── professor/
│   │   │   ├── login/page.tsx                # Professor login
│   │   │   ├── dashboard/page.tsx            # Professor dashboard
│   │   │   └── session/[sessionId]/page.tsx  # Active session view
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts            # Authentication
│   │       │   └── verify/route.ts           # Token verification
│   │       ├── sessions/
│   │       │   ├── start/route.ts            # Start session
│   │       │   ├── end/route.ts              # End session
│   │       │   └── [sessionId]/
│   │       │       ├── qr-token/route.ts     # Generate QR token
│   │       │       └── scans/route.ts        # Get session scans
│   │       └── scans/
│   │           ├── submit/route.ts           # Submit scan (main validation)
│   │           └── manual-override/route.ts  # Manual attendance
│   ├── components/
│   │   ├── QRDisplay.tsx                     # QR code display component
│   │   └── QRScanner.tsx                     # Camera scanner component
│   └── lib/
│       ├── supabase.ts                       # Supabase client
│       ├── auth.ts                           # Authentication utilities
│       ├── gps.ts                            # GPS utilities
│       ├── crypto.ts                         # Token/nonce generation
│       └── deviceId.ts                       # Device ID management
├── supabase-schema.sql                       # Complete database schema
├── SETUP.md                                  # Detailed setup instructions
└── package.json                              # Dependencies
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Supabase account (free tier works)

### 2. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL script from `supabase-schema.sql` in the SQL Editor
3. Note your Supabase URL, anon key, and service role key

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
Create `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_32_char_random_string
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_GPS_TOLERANCE_METERS=50
NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS=10
NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS=5
```

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

## 📖 Detailed Documentation

See [SETUP.md](SETUP.md) for:
- Detailed setup instructions
- Supabase configuration
- Creating professor accounts
- Testing procedures
- Production deployment
- Database management
- Troubleshooting guide

## 🔄 System Flow

### Professor Flow
1. Login with credentials
2. Start session (captures professor's GPS)
3. QR code displays and rotates every 5 seconds
4. Monitor incoming scans in real-time
5. View valid/invalid scans
6. Manual override if needed
7. End session when done

### Student Flow
1. Open app (no login required)
2. Enter student index, first name, last name
3. Grant location permissions (GPS captured)
4. Grant camera permissions
5. Scan QR code displayed by professor
6. Receive instant success/failure feedback

### Validation Flow (Server-side)
```
1. Check required fields
2. Validate GPS coordinates format
3. Verify session exists and is active
4. Check device hasn't already scanned (UNIQUE constraint)
5. Validate QR token format and expiry
6. Verify token exists in database
7. Check server nonce not used (replay protection)
8. Validate timestamp (clock sync)
9. Calculate GPS distance (Haversine formula)
10. Insert to scans_valid OR scans_invalid with reason
11. Mark server nonce as used
```

## 🗄️ Database Schema

### Tables
- **professors** - Professor accounts with hashed passwords
- **sessions** - Attendance sessions with fixed professor GPS
- **scans_valid** - Valid attendance records
- **scans_invalid** - Failed scans with detailed reasons
- **qr_tokens** - Active rotating QR tokens
- **used_server_nonces** - Prevents replay attacks

### Key Constraints
- `UNIQUE(session_id, device_id)` on `scans_valid` - Enforces one scan per device
- Foreign keys ensure referential integrity
- Timestamps with timezone for accurate time tracking

## 🔒 Security Features

1. **Password Security**: bcrypt hashing with cost factor 10
2. **JWT Tokens**: 24-hour expiry with HS256 signing
3. **Server Nonce**: Single-use tokens prevent replay attacks
4. **GPS Verification**: Haversine formula for accurate distance
5. **Device Fingerprinting**: Persistent UUID in localStorage
6. **Token Rotation**: QR codes expire quickly (10 seconds)
7. **Timestamp Validation**: Prevents time manipulation
8. **Row Level Security**: Supabase RLS policies included

## 🎨 User Interface

### Professor Dashboard
- Clean, modern design with TailwindCSS
- Real-time updates (polls every 3 seconds)
- Responsive tables for scan history
- Color-coded statistics (green/red)
- Modal for manual overrides

### Student Interface
- Mobile-first design
- Step-by-step wizard (form → GPS → scan → result)
- Clear success/failure feedback
- Error messages with actionable guidance
- Camera preview with scanning overlay

## 📊 Analytics & Reporting

### Available Queries
- Session statistics (valid vs invalid counts)
- Student attendance history
- Invalid scan analysis by reason
- Distance distribution analysis
- Time-based attendance patterns

### Export Options
Export attendance data to CSV/Excel via Supabase dashboard or custom SQL queries.

## 🧪 Testing

### Test Professor Account
- Email: `professor@test.com`
- Password: `password123`
(Created by the SQL script)

### Testing Tips
1. Use two devices (one for professor, one for student)
2. Test GPS validation by moving devices apart
3. Test device constraint by scanning twice
4. Test token expiry by waiting >10 seconds
5. Clear localStorage to reset device ID

## 🚀 Production Deployment

### Recommended: Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Important for Production
- Use HTTPS (required for GPS API)
- Change default professor password
- Generate secure JWT_SECRET
- Review RLS policies in Supabase
- Set up automated database cleanup

## 🔧 Configuration

Adjust these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GPS_TOLERANCE_METERS` | 50 | Max distance from professor |
| `TIMESTAMP_TOLERANCE_SECONDS` | 10 | Clock sync tolerance |
| `QR_TOKEN_ROTATION_SECONDS` | 5 | QR code rotation interval |

## 🐛 Common Issues

### GPS Not Working
- Requires HTTPS (except localhost)
- Student must grant location permissions
- Check device GPS is enabled

### Camera Not Working
- Browser needs camera permissions
- Works best on mobile devices
- Test with different browsers

### Duplicate Scan Error
- Device can only scan once per session
- Intentional security feature
- Use manual override if needed

## 📈 Future Enhancements

Potential features to add:
- Professor registration system
- Multiple class/course support
- Student accounts with history
- Email notifications
- Attendance reports/analytics dashboard
- Export to various formats (PDF, Excel)
- Integration with learning management systems
- Face recognition as additional validation
- NFC/Bluetooth beacon support

## 🤝 Contributing

This is a complete, working system ready for production use or further customization.

## 📄 License

Provided as-is for educational and commercial use.

## 💡 Credits

Built with Next.js, Supabase, and modern web technologies.

---

**Need Help?** See [SETUP.md](SETUP.md) for detailed instructions and troubleshooting.
