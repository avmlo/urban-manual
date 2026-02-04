# Payload CMS Setup Guide

## Environment Variables Status

✅ **You already have these configured in Vercel:**
- `POSTGRES_URL` - Your Supabase PostgreSQL connection string
- `PAYLOAD_SECRET` - Encryption key for Payload CMS

The config has been updated to use `POSTGRES_URL` (Vercel standard) as the primary database connection variable.

## Accessing the CMS

**Admin Panel URL:** `https://your-domain.vercel.app/admin`

### First Time Setup:
1. Visit `/admin`
2. Create your first admin user:
   - Email: your-email@example.com
   - Password: (choose a secure password)

## Troubleshooting

### Issue: CMS shows blank page or 404
**Possible causes:**
1. Environment variables not loaded → **Solution:** Redeploy after confirming POSTGRES_URL and PAYLOAD_SECRET are set
2. Payload not initialized → **Solution:** Visit `/admin` to trigger initialization
3. Build cache issue → **Solution:** Clear Vercel build cache and redeploy

### Issue: Database connection error
**Check:**
1. Is POSTGRES_URL correct? It should use connection pooling format:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
2. Is your Supabase project active?
3. Are there any IP restrictions on your Supabase database?

### Issue: Tables not created
**Solution:**
Payload auto-creates tables on first run. After setting environment variables:
1. Redeploy on Vercel
2. Visit `/admin` - this triggers table creation
3. Check your Supabase database for new tables: `payload_*`

### Issue: 500 Internal Server Error
**Check:**
1. Vercel function logs for specific error messages
2. Ensure PAYLOAD_SECRET is at least 32 characters
3. Verify POSTGRES_URL has correct format with password

## Verifying Configuration

### Check Environment Variables in Vercel:
1. Go to your project settings
2. Environment Variables tab
3. Confirm you have:
   - ✅ `POSTGRES_URL`
   - ✅ `PAYLOAD_SECRET`
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `NEXT_PUBLIC_GOOGLE_API_KEY`

### Check Deployment Logs:
Look for Payload initialization messages or errors in the build/runtime logs.

## Managing Destinations via CMS

Once the CMS is working:
1. Log in at `/admin`
2. Click "Destinations" in the sidebar
3. Add/Edit/Delete destinations
4. All changes sync to Supabase automatically
5. Front-end displays updates immediately

## Quick Fix Checklist

If CMS still not working after verifying environment variables:

- [ ] Redeploy the project from Vercel dashboard
- [ ] Clear build cache before redeploying
- [ ] Check Vercel function logs for errors
- [ ] Verify POSTGRES_URL format (pooled connection recommended)
- [ ] Try accessing `/api/admin` directly to check if Payload endpoints respond
- [ ] Check Supabase logs for connection attempts

## Next Steps

After the CMS is accessible:
1. Create your first admin user
2. Import existing destinations (or create new ones)
3. Configure user roles if needed (admin/editor)
4. Set up any custom fields or collections
