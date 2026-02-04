# Supabase CLI Migration Guide

This guide shows you how to use the Supabase CLI to manage your database migrations.

## Quick Start

### 1. Authenticate with Supabase

```bash
npx supabase login
```

This will open a browser window for you to authenticate. After logging in, you'll be able to use the CLI.

### 2. Link Your Project

You need your project reference ID. Find it in:
- **Supabase Dashboard** > **Project Settings** > **General** > **Reference ID**

Then link:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

For example:
```bash
npx supabase link --project-ref avdnefdfwvpjkuanhdwk
```

### 3. Check Migration Status

```bash
npx supabase migration list
```

This shows which migrations have been applied and which are pending.

### 4. Apply Pending Migrations

```bash
npx supabase db push
```

This applies all pending migrations from `supabase/migrations/` to your remote database.

## Automated Workflow

We've created a script that automates the entire process:

```bash
./scripts/supabase-migration-workflow.sh
```

This script will:
1. ✅ Check if you're authenticated
2. ✅ Check if project is linked (and help you link if needed)
3. ✅ Show migration status
4. ✅ List pending migrations
5. ✅ Optionally apply pending migrations

## Manual Commands

### Check Migration Status
```bash
npx supabase migration list
```

### Apply Migrations
```bash
npx supabase db push
```

### Create New Migration
```bash
npx supabase migration new migration_name
```

### Reset Local Database (DANGER: Only for local dev)
```bash
npx supabase db reset
```

## Current Migration Status

### Latest Migrations (in `supabase/migrations/`)

1. **421_ensure_michelin_is_dining.sql** ⚠️ **NEW - NOT APPLIED**
   - Ensures Michelin-starred destinations are categorized as Dining
   - Creates trigger and constraint

2. **420_add_nested_destinations.sql**
   - Adds parent-child destination support

3. **419_fix_user_profiles_rls.sql**
   - Fixes RLS on user_profiles table

4. **418_fix_additional_function_security.sql**
   - Additional function security fixes

5. **417_fix_all_security_issues.sql**
   - Comprehensive security fixes

### Total Migrations
- **supabase/migrations/**: 40 files (active)
- **migrations/**: 32 files (legacy, may contain duplicates)

## Troubleshooting

### "Cannot find project ref"
**Solution**: Link your project first:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### "Access token not provided"
**Solution**: Login first:
```bash
npx supabase login
```

### "Cannot connect to Docker daemon"
**Solution**: This is only needed for local development. For remote migrations, you don't need Docker.

### Migration conflicts
If you see conflicts, you may need to:
1. Check which migrations are already applied in Supabase Dashboard
2. Remove duplicate migrations
3. Re-apply with `npx supabase db push`

## Next Steps

1. ✅ Run `npx supabase login`
2. ✅ Run `npx supabase link --project-ref YOUR_PROJECT_REF`
3. ✅ Run `npx supabase migration list` to see status
4. ✅ Run `npx supabase db push` to apply pending migrations
5. ✅ Verify in Supabase Dashboard > Database > Migrations

## Alternative: Use Supabase Dashboard

If you prefer not to use CLI, you can:

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Copy the contents of pending migration files
3. Paste and run them manually
4. Mark them as applied in the migrations table

However, using CLI is recommended as it:
- ✅ Tracks migration state automatically
- ✅ Prevents duplicate applications
- ✅ Makes it easy to see what's pending
- ✅ Can be automated in CI/CD

