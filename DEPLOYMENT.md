# 🚀 Deployment Runbook

Complete guide for deploying bwave to production.

## Pre-Deployment Checklist

### 1. Environment Validation ✅
```bash
npm run validate-env
```
This checks all required environment variables are set. Must pass before build.

**Required variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `ANTHROPIC_API_KEY` - Claude API key

**Optional (production recommended):**
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT` - Set to `production`

### 2. Security Audit ✅
```bash
npm audit
npm run lint
npm test
```

### 3. Build Test ✅
```bash
npm run build
```

Must complete successfully with 0 errors.

---

## Vercel Deployment

### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select your GitHub repository (`patchygreen/bwave` or similar)
4. Vercel auto-detects Next.js 16

### Step 2: Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

⚠️ **Important:** Mark `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` as "Sensitive"

### Step 3: Deploy

Click "Deploy". Vercel will:
1. Run `npm run validate-env` (first build hook)
2. Run `npm run build`
3. Start Next.js server
4. Assign URL: `https://bwave-<random>.vercel.app`

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Test the production URL
curl https://your-bwave-url.vercel.app
```

Should return HTML with `bwave – Product Wave` title.

### 2. Test Authentication Flow

1. Visit `/login`
2. Sign up with test email
3. Verify redirect to `/app/dashboard`

### 3. Test File Extraction

1. Upload a PDF or image
2. Verify extraction completes
3. Check Sentry for any errors

### 4. Monitor Logs

In Vercel dashboard:
- Click "Deployments" → "Functions" → "Logs"
- Watch for errors from Claude API, database, or storage

### 5. Set Up Alerts

In Sentry dashboard (sentry.io):
- Go to your project → Alerts
- Create alert for errors in production
- Set notification to email or Slack

---

## Configuration

### Rate Limiting

Default limits (in `lib/rate-limit.ts`):

```
- extraction:  10 per hour per user (Claude calls cost money)
- export:      50 per hour per user
- upload:     100 per hour per user
```

To change:
1. Edit `lib/rate-limit.ts`
2. Modify `DEFAULT_LIMITS`
3. Redeploy

### Anthropic API

Monitor usage at [https://console.anthropic.com](https://console.anthropic.com):
- View token usage
- Set monthly budget limits
- Check cost per extraction

Typical cost: $0.02–$0.10 per extraction (depends on file size and model)

### Supabase

Monitor in Supabase dashboard:
- Storage: View upload bucket size
- Database: Check row counts in `uploads`, `product_waves`, `csv_exports`
- Auth: View active users

---

## Troubleshooting

### Build Fails: "Environment variable missing"

**Problem:** `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` not set

**Fix:**
1. Go to Vercel project → Settings → Environment Variables
2. Add missing variables
3. Redeploy

### Upload Fails with "403 Unauthorized"

**Problem:** Supabase RLS policy is blocking uploads

**Fix:**
1. Check Supabase RLS policies on `uploads` bucket
2. Ensure policy allows uploads for authenticated users
3. Check `profile_id` matches `auth.uid()`

### Claude API Returns "Rate limit exceeded"

**Problem:** Anthropic API rate limits hit

**Fix:**
1. Check [https://console.anthropic.com](https://console.anthropic.com) for usage
2. Wait 60 seconds before retrying
3. Consider upgrading Anthropic plan

### Error: "Failed to extract data"

**Problem:** Claude Vision failed to parse PDF/image

**Fix:**
1. Check Sentry dashboard for error details
2. Try re-uploading the file
3. Verify file is valid PDF or image
4. Check Anthropic API status

### Slow Extractions (>30 seconds)

**Problem:** Claude API taking too long

**Possible causes:**
- Large PDF file (>5MB) → compress it
- Many images in file → Claude processes each
- High load on Anthropic API

**Fix:**
- Recommend users optimize file size
- Split large PDFs into smaller files

---

## Maintenance & Cleanup

### Storage Cleanup

Periodically remove orphaned uploads (failed extractions, old files):

```bash
npm run cleanup
```

This script:
1. Finds uploads older than 7 days with no associated extraction
2. Deletes them from Supabase Storage
3. Removes database records

Run monthly or when storage usage grows.

### Rate Limit Refunds

When extraction fails (no product data returned):
- Rate limit is refunded (user isn't penalized)
- File stays in storage (user can retry)
- Cleanup script removes very old files later

---

## Monitoring Checklist

### Daily
- [ ] Check Sentry for new errors
- [ ] Review Anthropic API usage
- [ ] Check Vercel deployment logs

### Weekly
- [ ] Review Supabase storage usage
- [ ] Check rate limiting metrics (in logs)
- [ ] Verify all CSV exports are accessible

### Monthly
- [ ] Review Anthropic API costs
- [ ] Check database growth
- [ ] Run `npm run cleanup` to remove old orphaned uploads
- [ ] Backup Supabase (if using paid plan)

---

## Rollback

If deployment breaks production:

1. **Stop the issue:**
   ```
   # In Vercel: Click "Deployments" → previous stable version → "Promote to Production"
   ```

2. **Investigate:**
   - Check Sentry for error patterns
   - Review changed code in git
   - Check environment variables

3. **Fix locally:**
   ```bash
   git revert <broken-commit>
   npm run build
   git push
   # Vercel redeploys automatically
   ```

---

## Scaling Considerations

### Single-Server Limits

Current setup (in-memory rate limiting):
- Works for **~100 concurrent users**
- Rate limiting stored in memory (resets on server restart)

### For 1000+ Users

Replace in-memory rate limiting with Redis:
1. Add Redis to Vercel (via Redis Cloud)
2. Modify `lib/rate-limit.ts` to use Redis instead of Map
3. Redeploy

### Database Scaling

Monitor `product_waves` and `uploads` tables:
- If >100k rows: Add index on `profile_id`
- If >1M rows: Consider archiving old records
- Supabase handles scaling automatically on paid plans

---

## Security Checklist

### Secrets Management
- [ ] Never commit `.env.local`
- [ ] Use Vercel's Environment Variables (marked as Sensitive)
- [ ] Rotate API keys every 90 days
- [ ] Never log API keys or user emails

### HTTPS
- [ ] Vercel provides free HTTPS (auto-enabled)
- [ ] All API calls use HTTPS

### Authentication
- [ ] PKCE auth flow enabled
- [ ] Session stored in HTTP-only cookies
- [ ] CSRF protection via Next.js Server Actions

### Data
- [ ] Supabase RLS policies enforce user isolation
- [ ] All database queries check `profile_id == user.id`
- [ ] Files in storage organized by `user_id`

---

## Support

If issues arise:

1. **Check logs:**
   ```
   # Vercel Logs
   vercel logs <production-url>

   # Sentry Dashboard
   sentry.io → Your Project
   ```

2. **Common fixes:**
   - Restart deployment: `vercel redeploy`
   - Clear cache: `vercel cache clear`
   - Check status: `vercel status`

3. **Contact support:**
   - Anthropic: [support@anthropic.com](mailto:support@anthropic.com)
   - Supabase: [support@supabase.io](mailto:support@supabase.io)
   - Vercel: [vercel.com/support](https://vercel.com/support)
