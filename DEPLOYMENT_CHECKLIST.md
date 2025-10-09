# Deployment Checklist

## Pre-Deployment

### Database Setup
- [ ] Created Supabase project
- [ ] Ran `supabase-schema.sql` successfully
- [ ] Verified all tables were created (8 tables)
- [ ] Tested database functions (calculate_distance, etc.)
- [ ] Created at least one test professor account
- [ ] Verified RLS policies are enabled

### Environment Configuration
- [ ] Created `.env.local` file
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Generated secure `JWT_SECRET` (min 32 chars)
- [ ] Configured GPS tolerance (default: 50m)
- [ ] Configured timestamp tolerance (default: 10s)
- [ ] Configured QR rotation interval (default: 5s)
- [ ] Set `NEXT_PUBLIC_APP_VERSION`

### Local Testing
- [ ] Ran `npm install` successfully
- [ ] Ran `npm run dev` successfully
- [ ] Tested professor login
- [ ] Tested session creation
- [ ] Verified QR code generation and rotation
- [ ] Tested student scan flow
- [ ] Verified GPS validation works
- [ ] Tested device constraint (duplicate scan prevention)
- [ ] Tested manual override
- [ ] Checked all validations (9 validation checks)
- [ ] Verified invalid scans are logged with reasons
- [ ] Tested session end functionality

### Security Review
- [ ] Changed default professor password
- [ ] JWT_SECRET is random and secure
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets committed to git
- [ ] Reviewed RLS policies in Supabase
- [ ] Verified service role key is secure

## Deployment (Vercel)

### Pre-Deploy
- [ ] Code pushed to GitHub/GitLab
- [ ] `.env.local` NOT committed
- [ ] All dependencies in `package.json`
- [ ] `npm run build` succeeds locally

### Vercel Setup
- [ ] Created Vercel account
- [ ] Imported GitHub repository
- [ ] Added all environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET`
  - `NEXT_PUBLIC_APP_VERSION`
  - `NEXT_PUBLIC_GPS_TOLERANCE_METERS`
  - `NEXT_PUBLIC_TIMESTAMP_TOLERANCE_SECONDS`
  - `NEXT_PUBLIC_QR_TOKEN_ROTATION_SECONDS`
- [ ] Configured custom domain (optional)
- [ ] Deployed successfully

### Post-Deploy Testing
- [ ] Visited production URL (HTTPS)
- [ ] Tested professor login on production
- [ ] Started a session on production
- [ ] Scanned QR code from mobile device
- [ ] Verified GPS permissions work on HTTPS
- [ ] Verified camera permissions work
- [ ] Checked all validations work in production
- [ ] Tested manual override in production
- [ ] Verified database writes in Supabase

## Production Configuration

### Supabase Production Settings
- [ ] Enabled "Confirm email" (if using email auth)
- [ ] Set up backup schedule
- [ ] Configured database connection pooling (if needed)
- [ ] Set up monitoring/alerts

### Performance
- [ ] Verified QR codes load quickly
- [ ] Checked API response times
- [ ] Tested with multiple concurrent users
- [ ] Verified mobile performance

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure analytics (optional)
- [ ] Set up uptime monitoring
- [ ] Check Vercel analytics

## Post-Launch

### Database Maintenance
- [ ] Schedule cleanup of old nonces (daily recommended)
```sql
DELETE FROM used_server_nonces WHERE created_at < NOW() - INTERVAL '24 hours';
```
- [ ] Schedule cleanup of expired tokens
```sql
DELETE FROM qr_tokens WHERE expires_at < NOW();
```
- [ ] Set up automated backups
- [ ] Plan for data retention policy

### User Management
- [ ] Create production professor accounts
- [ ] Document professor registration process
- [ ] Set up password reset flow (if needed)
- [ ] Create admin user management system (optional)

### Documentation
- [ ] Share SETUP.md with professors
- [ ] Create user guide for students
- [ ] Document any custom configurations
- [ ] Create troubleshooting guide for common issues

### Security Hardening
- [ ] Enable Supabase IP restrictions (optional)
- [ ] Set up rate limiting (Vercel Edge Config)
- [ ] Review and update RLS policies as needed
- [ ] Schedule security audits
- [ ] Monitor for suspicious activity

## Ongoing Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Check for failed scans
- [ ] Review invalid scan reasons

### Weekly
- [ ] Clean up old nonces
- [ ] Clean up expired tokens
- [ ] Review session statistics
- [ ] Check database size

### Monthly
- [ ] Backup database
- [ ] Review security logs
- [ ] Update dependencies (`npm update`)
- [ ] Performance audit
- [ ] User feedback review

## Rollback Plan

If issues occur:
1. Revert to previous Vercel deployment
2. Check environment variables
3. Verify Supabase is operational
4. Check for database schema changes
5. Review recent code changes

## Support Contacts

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- GitHub Issues: [your-repo-url]/issues

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-09 | Initial deployment |

---

## Quick Test Script

Run this after deployment to verify everything works:

1. **Professor Flow** (5 minutes)
   - Login at `/professor/login`
   - Start session
   - Verify QR code displays
   - Check QR code rotates every 5s

2. **Student Flow** (5 minutes)
   - Open homepage on mobile
   - Enter test data
   - Grant permissions
   - Scan QR code
   - Verify success message

3. **Validation Tests** (10 minutes)
   - Try scanning from >50m away (should fail)
   - Try scanning twice with same device (should fail)
   - Wait >10s and scan old QR (should fail)
   - Verify all failures logged in invalid_scans

4. **Manual Override** (2 minutes)
   - Open session page
   - Click "Manual Override"
   - Add student manually
   - Verify appears in valid scans

5. **Session End** (2 minutes)
   - Click "End Session"
   - Verify session marked inactive
   - Verify can't scan QR anymore

**Total Test Time: ~25 minutes**

---

✅ Deployment complete when all items checked!
