# Quick Start: Supabase Migrations via CLI

## 🚀 Run This Now

Open your terminal and run:

```bash
./scripts/supabase-migration-workflow-interactive.sh
```

This will guide you through:
1. ✅ Logging in to Supabase
2. ✅ Linking your project
3. ✅ Checking migration status
4. ✅ Applying pending migrations

## 📝 Manual Steps (if you prefer)

### 1. Login
```bash
npx supabase login
```
*Opens browser for authentication*

### 2. Link Project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```
*Find your project ref in: Supabase Dashboard > Settings > General > Reference ID*

### 3. Check Status
```bash
npx supabase migration list
```

### 4. Apply Migrations
```bash
npx supabase db push
```

## 🎯 What This Will Do

- Check which migrations are already applied
- Show you pending migrations (like `421_ensure_michelin_is_dining.sql`)
- Apply all pending migrations to your remote database
- Keep your database schema up to date

## ⚠️ Important

- Make sure you're logged into the correct Supabase account
- Double-check your project reference ID before linking
- The `db push` command will apply ALL pending migrations

## 📊 Current Pending Migrations

The latest migration that needs to be applied:
- **421_ensure_michelin_is_dining.sql** - Ensures Michelin-starred destinations are categorized as Dining

