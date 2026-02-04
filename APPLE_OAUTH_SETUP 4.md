# Apple OAuth Setup Guide

## OAuth Flow

The OAuth flow works as follows:

1. **User clicks "Sign in with Apple"** → Redirects to Apple's OAuth page
2. **Apple processes authentication** → User authorizes the app
3. **Apple redirects to Supabase** → `https://avdnefdfwvpjkuanhdwk.supabase.co/auth/v1/callback?code=...`
4. **Supabase processes the callback** → Validates the code with Apple
5. **Supabase redirects to your app** → `https://yourdomain.com/auth/callback?code=...`
6. **Your app exchanges code for session** → `/app/auth/callback/route.ts` handles this

## Required Configuration

### 1. Supabase Dashboard Configuration

Go to **Supabase Dashboard → Authentication → URL Configuration** and add your redirect URLs:

**For Development:**
```
http://localhost:3000/auth/callback
http://localhost:3000/**
```

**For Production:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/**
```

**For Vercel Preview Deployments:**
```
https://*.vercel.app/auth/callback
https://*.vercel.app/**
```

### 2. Apple Developer Console Configuration

1. **Services ID Configuration:**
   - Go to Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers
   - Select your Services ID (or create one)
   - Configure "Sign in with Apple"
   - Add **Website URLs**:
     - **Domain**: `avdnefdfwvpjkuanhdwk.supabase.co`
     - **Return URLs**: `https://avdnefdfwvpjkuanhdwk.supabase.co/auth/v1/callback`

2. **App ID Configuration:**
   - Ensure your App ID has "Sign in with Apple" capability enabled
   - Link your Services ID to your App ID

### 3. Supabase Apple Provider Configuration

Go to **Supabase Dashboard → Authentication → Providers → Apple**:

1. **Enable Apple provider**
2. **Services ID**: Your Apple Services ID (e.g., `com.example.app.web`)
3. **Client Secret**: Generate using your `.p8` signing key
   - Use the [Supabase client secret generator](https://supabase.com/docs/guides/auth/social-login/auth-apple#generate-a-client_secret)
   - Requires your `.p8` file (keep this secure!)
   - **Important**: This secret expires every 6 months - set a reminder to rotate it

### 4. Verify Redirect URL in Code

The code already sets the correct redirect URL:
- `contexts/AuthContext.tsx`: `redirectTo: ${window.location.origin}/auth/callback`
- `app/account/page.tsx`: `redirectTo: ${window.location.origin}/auth/callback`

This will automatically use:
- `http://localhost:3000/auth/callback` (development)
- `https://yourdomain.com/auth/callback` (production)

## Testing

1. **Test in Development:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/auth/login
   # Click "Continue with Apple"
   ```

2. **Verify Redirect URL:**
   - Check browser console for any redirect errors
   - Verify the final redirect goes to `/auth/callback`
   - Check that session is created after callback

## Troubleshooting

### Error: "requested path is invalid"
- **Cause**: Redirect URL not whitelisted in Supabase
- **Fix**: Add your redirect URL to Supabase Dashboard → Authentication → URL Configuration

### Error: "Invalid redirect_uri"
- **Cause**: Apple Services ID doesn't have the correct return URL
- **Fix**: Add `https://avdnefdfwvpjkuanhdwk.supabase.co/auth/v1/callback` to Apple Developer Console

### Error: "Invalid client secret"
- **Cause**: Client secret expired or invalid
- **Fix**: Regenerate client secret using your `.p8` file (rotates every 6 months)

### OAuth works but session not created
- **Cause**: Callback route not exchanging code properly
- **Fix**: Check `/app/auth/callback/route.ts` logs and verify `exchangeCodeForSession` is working

## Current Redirect URLs

The application uses these callback URLs:
- **Development**: `http://localhost:3000/auth/callback`
- **Production**: `https://yourdomain.com/auth/callback` (automatically detected from `window.location.origin`)

Make sure both are added to Supabase's redirect URL whitelist!

