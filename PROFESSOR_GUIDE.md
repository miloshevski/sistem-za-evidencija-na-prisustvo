# Professor Quick Start Guide

## 📱 Before Your First Session

### 1. Test Your Device
- Ensure your device has GPS/location enabled
- Use a device that will stay stationary during class
- Test in your actual classroom location

### 2. Browser Requirements
- Use Chrome, Safari, or Edge (latest version)
- Allow location permissions when prompted
- Keep the browser tab active during session

## 🚀 Starting an Attendance Session

### Step 1: Login
1. Go to the website
2. Click "Professor? Click here to login" at the bottom
3. Enter your credentials
4. Click "Sign in"

### Step 2: Start Session
1. On the dashboard, click **"Start New Session"**
2. Allow location access when prompted
3. Wait 2-3 seconds for GPS lock
4. You'll be redirected to the session page

### Step 3: Display QR Code
- A QR code will appear on screen
- This code rotates every 5 seconds (security feature)
- Keep this page visible to students
- Optionally project it on a screen

**💡 Tip**: Increase brightness so students can scan easily

## 👥 During the Session

### Monitor Scans in Real-Time
The page automatically updates every 3 seconds showing:
- **Valid Scans** (green) - Students who successfully checked in
- **Invalid Scans** (red) - Failed attempts with reasons

### Understanding Scan Status

#### ✅ Valid Scan Shows:
- Time of scan
- Student index
- Student name
- Distance from you (in meters)

#### ❌ Invalid Scan Shows:
- Time of attempt
- Student information (if provided)
- Reason for failure (e.g., "Too far", "Already scanned")

### Common Invalid Scan Reasons

| Reason | What It Means | Solution |
|--------|--------------|----------|
| "Distance exceeds maximum" | Student is >50m away | Ask student to come closer |
| "Device has already submitted" | Same phone scanned twice | Normal - prevents duplicates |
| "Invalid or expired QR token" | QR code too old | Ask student to scan fresh QR |
| "Session not found or inactive" | Session ended | Start new session |
| "Clock synchronization issue" | Phone time is wrong | Student needs to fix phone time |

## ✏️ Manual Override

If a student couldn't scan (technical issues, forgot phone, etc.):

1. Click **"Manual Override"** button (top right)
2. Enter student information:
   - Student Index
   - First Name
   - Last Name
   - Reason (optional, for your records)
3. Click **"Add Override"**

**Note**: Manual overrides appear in the valid scans list with 0m distance.

## 🛑 Ending the Session

When class is over:

1. Click **"End Session"** (red button, top right)
2. Confirm the action
3. You'll be returned to the dashboard

**Important**:
- Once ended, students can no longer scan
- QR codes for that session become invalid
- Data remains in database for your records

## 📊 After the Session

### View Attendance
All valid scans are saved and can be:
- Viewed in Supabase dashboard
- Exported to CSV/Excel
- Analyzed for patterns

### Typical Workflow
1. End session in app
2. Go to Supabase dashboard
3. Run query to export attendance (see SETUP.md)
4. Import to Excel/Google Sheets

## ⚠️ Troubleshooting

### "Failed to get your location"
**Cause**: Browser blocked GPS or device GPS is off

**Solutions**:
- Check browser permissions (click lock icon in address bar)
- Enable location services on your device
- Try refreshing the page
- Use a different browser

### "You already have an active session"
**Cause**: Previous session wasn't ended properly

**Solutions**:
- Check if you have another tab open with active session
- Ask admin to manually end the session in database
- Wait 5 minutes and try again

### QR Code Not Rotating
**Cause**: Internet connection issue or browser tab inactive

**Solutions**:
- Check internet connection
- Refresh the page
- Keep browser tab active (don't minimize)
- Check browser console for errors (F12)

### Students Can't Scan
**Common Issues**:

1. **Phone too far away**
   - Student must be within 50 meters
   - GPS accuracy varies (±10m typical)

2. **QR code expired**
   - Tell students to wait for fresh QR (5 seconds)
   - They're trying to scan a photo/screenshot (won't work)

3. **Camera not working**
   - Student needs to allow camera permissions
   - Try different browser
   - Clean camera lens

4. **GPS disabled**
   - Student must enable location services
   - Must allow browser location access

5. **Duplicate scan attempt**
   - Each phone can only scan once per session
   - This is intentional (prevents fraud)
   - Use manual override if needed

### No Scans Appearing
**Cause**: Network issue or database connection problem

**Solutions**:
- Check your internet connection
- Refresh the page
- Check Supabase status: status.supabase.com
- Contact support

## 💡 Best Practices

### Before Class
- [ ] Test your device GPS in the classroom
- [ ] Ensure good internet connection
- [ ] Have backup plan (paper attendance sheet)
- [ ] Arrive 5 minutes early to set up

### During Class
- [ ] Start session at the beginning
- [ ] Display QR prominently
- [ ] Monitor for invalid scans
- [ ] Address issues immediately
- [ ] Keep device stationary (GPS lock)

### After Class
- [ ] End session when done
- [ ] Review scan statistics
- [ ] Check for absent students
- [ ] Export data for records

### Security Tips
- 🔒 Never share your password
- 🔒 Log out on shared devices
- 🔒 End sessions when done
- 🔒 Report suspicious activity

## 📈 Understanding Statistics

### Valid Scans
- Number of students who successfully checked in
- Distance shown is accuracy indicator (<10m is excellent)

### Invalid Scans
- Failed attempts (don't count as present)
- Review these to help students with issues
- Some invalid scans are normal (duplicates, retries)

### Typical Session
- Valid: 80-95% of expected students
- Invalid: 5-20% (mostly duplicates and retries)
- Distance: Most should be 5-30 meters

## 🔐 Security Features Explained

### Why QR Codes Rotate
- Prevents students from taking photos and using later
- Prevents sharing screenshots
- Codes expire in 10 seconds for security

### Why GPS is Required
- Ensures students are physically present
- Prevents remote scanning
- 50-meter radius allows for GPS inaccuracy

### Why One Scan Per Device
- Prevents one phone from scanning multiple times
- Each student should use their own device
- Manual override available for legitimate cases

## 📞 Getting Help

### For Technical Issues
1. Check this guide's troubleshooting section
2. Check SETUP.md for detailed information
3. Contact IT support
4. Check system status

### For Student Issues
1. Check invalid scan reason
2. Help student with specific problem
3. Use manual override if needed
4. Keep paper backup just in case

## 📋 Quick Reference Card

Print and keep this at your desk:

```
LOGIN: /professor/login
↓
START SESSION: Click "Start New Session"
↓
DISPLAY QR: Show to students (rotates every 5s)
↓
MONITOR: Check valid/invalid scans in real-time
↓
MANUAL OVERRIDE: If needed, click button
↓
END SESSION: Click "End Session" when done
```

**Student Must Have**:
✅ Mobile phone with camera
✅ GPS/Location enabled
✅ Camera permissions granted
✅ Be within 50 meters of you

**Emergency Contacts**:
- IT Support: [your-support-email]
- System Admin: [admin-email]
- Help Docs: [your-docs-url]

---

**Remember**: The system is designed to be easy and secure. Most issues can be solved by having students retry or using manual override for legitimate cases.

**Questions?** Check SETUP.md for more details!
