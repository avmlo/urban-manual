# Payload CMS + Supabase Authentication Integration

## Overview

Payload CMS is configured to use **your existing Supabase authentication** instead of creating a duplicate auth system. This means:

✅ **Single authentication system** - Supabase handles all auth
✅ **No duplicate user management** - One source of truth
✅ **Admin role checking** - Uses your existing `app_metadata.role === 'admin'`
✅ **Seamless integration** - Works with your current auth flow

## How It Works

### 1. **Admin Route Protection**

The `/admin` route is protected by Supabase authentication:

```typescript
// app/admin/[[...segments]]/page.tsx
- Checks Supabase session
- Verifies admin role (app_metadata.role === 'admin')
- Redirects to login if not authenticated
- Redirects to account page if not admin
```

### 2. **Access Control**

Payload collections use Supabase auth for access control:

```typescript
// payload.config.ts
access: {
  read: async ({ req }) => await checkSupabaseAdmin(req),
  create: async ({ req }) => await checkSupabaseAdmin(req),
  // ... etc
}
```

### 3. **Minimal User Collection**

Payload still needs a `users` collection for its internal operations, but:
- It's **read-only** (no create/update/delete)
- It's **not used for authentication**
- Supabase handles all actual user management

## Accessing Payload Admin

### Step 1: Sign In via Supabase

1. Visit your site
2. Click **Sign In** (uses your existing Supabase auth)
3. Sign in with your Supabase account

### Step 2: Verify Admin Role

Your Supabase user must have `admin` role in `app_metadata`:

```sql
-- In Supabase SQL Editor
UPDATE auth.users 
SET app_metadata = jsonb_set(
  app_metadata, 
  '{role}', 
  '"admin"'
)
WHERE email = 'your-email@example.com';
```

### Step 3: Access Payload

1. After signing in, visit `/payload`
2. The page will check your Supabase session
3. If you're an admin, Payload admin UI loads
4. If not, you'll be redirected

**Note:** The custom admin page is still available at `/admin`

## Benefits

✅ **No Duplicate Auth**
- One login system (Supabase)
- One user database (Supabase)
- One role management (Supabase)

✅ **Consistent Experience**
- Same login flow for your app and CMS
- Same admin role checking
- Same session management

✅ **Simplified Management**
- Manage users in Supabase
- Set admin roles in Supabase
- No need to manage Payload users separately

## User Collection

The `users` collection in Payload is minimal:

- **Purpose**: Payload internals only
- **Auth**: Disabled (Supabase handles auth)
- **Access**: Read-only
- **Fields**: email, supabase_user_id, role

**Note**: You don't need to create users in Payload. All user management happens in Supabase.

## Setting Admin Role

To give a user admin access:

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard
2. Authentication → Users
3. Find the user
4. Edit user metadata
5. Add: `{ "role": "admin" }`

### Option 2: Via SQL

```sql
UPDATE auth.users 
SET app_metadata = jsonb_set(
  COALESCE(app_metadata, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';
```

## Troubleshooting

### "Unauthorized" when accessing /admin

1. **Check you're signed in**: Visit `/account` to verify session
2. **Check admin role**: Verify `app_metadata.role === 'admin'` in Supabase
3. **Check cookies**: Ensure Supabase session cookies are set

### Payload shows login screen

- This is Payload's default UI
- It should redirect to Supabase login
- If it doesn't, check the auth check in `page.tsx`

### Can't edit destinations

- Verify you're signed in via Supabase
- Verify you have admin role
- Check browser console for errors
- Check Vercel function logs

## Summary

**Your existing Supabase authentication is sufficient!**

- ✅ Payload uses Supabase for authentication
- ✅ No duplicate user system needed
- ✅ Same admin role checking
- ✅ Seamless integration

The only thing Payload needs is:
- A minimal `users` collection (for internal operations)
- Access control hooks (to verify Supabase auth)
- Route protection (to check admin role)

All actual authentication and user management happens in Supabase, exactly as you already have it set up.

