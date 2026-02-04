# Supabase URL Configuration Fix

## Problem
After Apple sign-in, redirects to: `https://avdnefdfwvpjkuanhdwk.supabase.co/www.urbanmanual.co#access_token=e`

This happens because Supabase is prepending its domain to the redirect URL.

## Solution

### Important Note
The "Site URL" in Supabase Authentication settings is **NOT a custom domain feature** - it's a free configuration field available to all plans. If you can't access it, make sure you're in the right place:
- **Location:** Supabase Dashboard → Authentication → URL Configuration → Site URL
- This is different from custom domains (which are a Pro feature)

### 1. Update Supabase Redirect URLs (Required) ✅

**Location:** Supabase Dashboard → Authentication → URL Configuration

**Redirect URLs**: Add these exact URLs (this is the most important step):
```
https://www.urbanmanual.co/auth/callback
https://www.urbanmanual.co/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

### 2. Update Site URL (If Available) ✅

**Location:** Supabase Dashboard → Authentication → URL Configuration

1. **Site URL**: Set to `https://www.urbanmanual.co`
   - This tells Supabase your app's canonical domain
   - Available on all Supabase plans (free configuration field)
   - If you can't find this field, ensure Redirect URLs are whitelisted (step 1)

### 3. Verify Code Configuration

The code has been updated to:
- Use PKCE flow (code exchange) instead of implicit flow (hash fragments)
- Pass absolute URLs to `redirectTo`
- Handle redirects correctly in the callback route

### Alternative: If Site URL Field is Not Available

If you truly cannot access the Site URL field:
1. **Ensure Redirect URLs are whitelisted** (most important - see step 1)
2. The code will handle the redirect properly once the URL is whitelisted
3. Supabase should respect the absolute URL in `redirectTo` if it's in the whitelist

### 4. Test the Flow

After updating Supabase configuration:
1. Sign in with Apple
2. Should redirect to: `https://www.urbanmanual.co/auth/callback?code=...`
3. Callback route exchanges code for session
4. Redirects to: `https://www.urbanmanual.co/`

## Why This Happens

Supabase prepends its domain when:
- Site URL is not set correctly
- Redirect URL is not whitelisted
- Using implicit flow instead of PKCE

The fix ensures:
- Site URL is set to your domain
- Using PKCE flow (code-based, not hash-based)
- Absolute URLs are used for redirects

