# Apple OAuth Configuration Checklist

## Required Apple Developer Console Configuration

### 1. Services ID Configuration ✅

**Location:** Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers → Services IDs

1. **Create or Select Services ID**
   - Example: `com.urbanmanual.web` or similar
   - Must be unique reverse-domain format

2. **Enable "Sign in with Apple"**
   - Click on your Services ID
   - Check "Sign in with Apple"
   - Click "Configure"

3. **Configure Website URLs** (CRITICAL)
   - **Primary App ID**: Select your App ID (e.g., `com.urbanmanual.app`)
   - **Website URLs**:
     - **Domains and Subdomains**: `avdnefdfwvpjkuanhdwk.supabase.co`
     - **Return URLs**: `https://avdnefdfwvpjkuanhdwk.supabase.co/auth/v1/callback`
   - Click "Save"

### 2. App ID Configuration ✅

**Location:** Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers → App IDs

1. **Select or Create App ID**
   - Example: `com.urbanmanual.app`
   
2. **Enable "Sign in with Apple" Capability**
   - Check the "Sign in with Apple" checkbox
   - Click "Save"

3. **Link Services ID** (if not already linked)
   - Make sure your Services ID is associated with this App ID

### 3. Create Signing Key (.p8 file) ✅

**Location:** Apple Developer Console → Certificates, Identifiers & Profiles → Keys

1. **Create New Key**
   - Click "+" to create new key
   - **Key Name**: "Urban Manual Auth Key" (or similar)
   - **Enable "Sign in with Apple"**
   - Click "Continue" → "Register"

2. **Download the .p8 file** ⚠️ CRITICAL
   - You can only download this ONCE
   - Save it securely (you'll need it every 6 months to rotate the secret)
   - Store in a secure location (password manager, encrypted storage)

3. **Note the Key ID**
   - Copy the Key ID (e.g., `ABC123XYZ`)
   - You'll need this to generate the client secret

### 4. Generate Client Secret ✅

**Location:** Use Supabase's client secret generator

1. **Go to Supabase Docs:**
   - Visit: https://supabase.com/docs/guides/auth/social-login/auth-apple#generate-a-client_secret
   - Use the client secret generator tool

2. **Enter Required Information:**
   - **Team ID**: Found in Apple Developer Console (top right, under your name)
   - **Services ID**: Your Services ID (e.g., `com.urbanmanual.web`)
   - **Key ID**: The Key ID from step 3
   - **Private Key**: Paste the contents of your `.p8` file

3. **Copy the Generated Secret**
   - This is your client secret
   - Valid for 6 months (then you need to regenerate)

### 5. Supabase Dashboard Configuration ✅

**Location:** Supabase Dashboard → Authentication → Providers → Apple

1. **Enable Apple Provider**
   - Toggle "Enable Apple provider" to ON

2. **Enter Configuration:**
   - **Services ID**: Your Services ID (e.g., `com.urbanmanual.web`)
   - **Client Secret**: Paste the secret generated in step 4

3. **Save Configuration**

### 6. Verify Redirect URLs in Supabase ✅

**Location:** Supabase Dashboard → Authentication → URL Configuration

1. **Add Redirect URLs:**
   - `https://www.urbanmanual.co/auth/callback`
   - `https://www.urbanmanual.co/**`
   - `http://localhost:3000/auth/callback` (for development)

2. **Site URL:**
   - Set to: `https://www.urbanmanual.co`

## Important Notes ⚠️

### Secret Key Rotation
- **Apple requires secret rotation every 6 months**
- Set a calendar reminder 5 months from now
- You'll need your `.p8` file to regenerate
- Update the secret in Supabase Dashboard before it expires

### Security
- **Never commit `.p8` file to git**
- Store it securely (password manager, encrypted storage)
- If compromised, revoke immediately in Apple Developer Console

### Testing
1. Test in development first (`localhost:3000`)
2. Verify redirect URL is whitelisted
3. Check browser console for any errors
4. Verify session is created after callback

## Current Configuration Summary

Based on your setup:
- **Supabase Project**: `avdnefdfwvpjkuanhdwk.supabase.co`
- **Production Domain**: `www.urbanmanual.co`
- **Callback URL**: `https://www.urbanmanual.co/auth/callback`
- **Apple Redirect URL**: `https://avdnefdfwvpjkuanhdwk.supabase.co/auth/v1/callback`

## Quick Verification Steps

1. ✅ Services ID has "Sign in with Apple" enabled
2. ✅ Website URLs configured with Supabase domain
3. ✅ Return URL matches Supabase callback endpoint
4. ✅ App ID has "Sign in with Apple" capability
5. ✅ Signing key created and `.p8` file downloaded
6. ✅ Client secret generated and added to Supabase
7. ✅ Redirect URLs whitelisted in Supabase
8. ✅ Test sign-in flow end-to-end

