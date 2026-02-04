# Supabase New Keys Migration Guide

## Overview

Supabase is transitioning from legacy keys (`anon` and `service_role`) to new keys (`publishable` and `secret`). This migration enhances security and provides better key management.

## Timeline

- **November 1, 2025**: New projects will no longer have access to legacy keys
- **Late 2026**: All projects must transition to new keys
- **Current**: Legacy keys still work, but migration is recommended

## Key Mappings

| Legacy Key | New Key | Usage |
|------------|---------|-------|
| `anon` | `publishable` | Client-side, respects RLS |
| `service_role` | `secret` | Server-side, bypasses RLS |

## Benefits of New Keys

1. **Enhanced Security**
   - Create multiple secret keys for different services
   - Revoke keys individually without affecting others
   - Better key rotation capabilities

2. **Better Management**
   - Assign specific keys to different parts of your application
   - Track key usage
   - More granular control

## How to Get New Keys

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Urban Manual** (ID: `avdnefdfwvpjkuanhdwk`)
3. Navigate to **Settings** → **API** (or go directly to: https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk/settings/api)

### Step 2: Enable New API Keys
1. Look for the **"API Keys"** section
2. Find **"Publishable key"** and **"Secret key"** sections
3. If you see **"Opt-in to new API keys"** or a toggle, enable it
4. The new keys will be displayed:
   - **Publishable key**: Starts with `sb_publishable_...`
   - **Secret key**: Starts with `sb_secret_...`

### Step 3: Copy the Keys
- Copy the **Publishable key** (replaces `anon` key)
- Copy the **Secret key** (replaces `service_role` key)
- Keep these secure - especially the secret key!

## Environment Variable Naming

### Recommended (New Keys)
```bash
# Client-side (browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# Server-side (API routes, scripts)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key-here
```

### Current (Legacy Keys - Still Supported)
```bash
# Client-side
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Migration Steps

1. **Get New Keys from Supabase Dashboard**
   - Settings → API → Opt-in to new keys

2. **Update Environment Variables**
   - Add new keys to Vercel (keep old ones during transition)
   - Update `.env.local` for local development

3. **Update Code (Optional - Current Code Supports Both)**
   - Our code already supports both naming conventions
   - Can add explicit support for new key names

4. **Test Thoroughly**
   - Test in development first
   - Verify all Supabase operations work
   - Check RLS policies still work correctly

5. **Deploy**
   - Set new keys in Vercel
   - Redeploy (NEXT_PUBLIC_ vars are inlined at build time)

6. **Remove Legacy Keys (After Verification)**
   - Once confirmed new keys work, remove legacy keys

## Code Updates Needed

Our current code in `lib/supabase.ts` already supports fallback:
- Tries `NEXT_PUBLIC_SUPABASE_ANON_KEY` first
- Falls back to `SUPABASE_ANON_KEY`

We should add support for:
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new)
- `SUPABASE_SECRET_KEY` (new)

## Important Notes

- **Backward Compatible**: New keys work as drop-in replacements
- **Same Permissions**: `publishable` = `anon`, `secret` = `service_role`
- **RLS Still Applies**: `publishable` key respects RLS just like `anon`
- **No Code Changes Required**: New keys work with existing Supabase client code
- **Migration is Optional (for now)**: Legacy keys still work until late 2026

## Recommendation

**Yes, we should migrate to the new keys** because:
1. Better security and key management
2. Future-proof (required by late 2026)
3. No breaking changes - works as drop-in replacement
4. Can test migration now while legacy keys still work

## Next Steps

✅ **Step 1: Code is Ready** - Already updated to support both old and new keys (new keys are preferred)

**Step 2: Get New Keys from Supabase Dashboard**
- Go to: https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk/settings/api
- Copy your new **Publishable key** and **Secret key**

**Step 3: Update Vercel Environment Variables**
1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add the new keys:
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = (your publishable key)
   - `SUPABASE_SECRET_KEY` = (your secret key)
4. **Keep the old keys** during transition for safety
5. Set for all environments (Production, Preview, Development)

**Step 4: Test Locally (Optional)**
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
  SUPABASE_SECRET_KEY=your-secret-key
  ```
- Run `npm run dev` and test Supabase operations

**Step 5: Deploy**
- Push to trigger a new deployment
- Vercel will use the new keys automatically
- The code will prefer new keys, falling back to legacy keys if needed

**Step 6: Verify & Clean Up**
- After confirming everything works (wait 24-48 hours)
- Remove legacy keys from Vercel:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (can be removed)
  - `SUPABASE_SERVICE_ROLE_KEY` (can be removed)

