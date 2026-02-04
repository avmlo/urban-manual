# Database Migration Guide - Urban Manual

**Date:** October 30, 2025  
**Author:** Manus AI  
**Status:** Ready to Execute

---

## Overview

This guide will walk you through safely normalizing your Supabase database. The migration creates new tables without touching your existing data, ensuring your site stays online throughout the process.

---

## What This Migration Does

### New Tables Created:
1. **`cities`** - Normalized city data (replaces city strings)
2. **`categories`** - Normalized category data (replaces category strings)
3. **`profiles`** - User profile information
4. **`list_destinations`** - Join table for lists ↔ destinations relationship

### What Stays the Same:
- ✅ All existing `destinations` data remains untouched
- ✅ Your site continues to work normally
- ✅ No data is deleted or modified

---

## Step 1: Create New Tables in Supabase

1. Go to your Supabase SQL Editor:
   **https://supabase.com/dashboard/project/avdnefdfwvpjkuanhdwk/sql**

2. Click **"New Query"**

3. Copy and paste the entire SQL from `migrations/001_create_normalized_tables.sql`

4. Click **"Run"** (or press Cmd/Ctrl + Enter)

5. You should see: **"Success. No rows returned"**

---

## Step 2: Populate New Tables with Data

After creating the tables, run this script to migrate your existing data:

```bash
cd /home/ubuntu/urban-manual
python3 scripts/002_populate_normalized_tables.py
```

This script will:
- Extract unique cities from `destinations` and create city records
- Extract unique categories and create category records
- Preserve all existing data

**Expected output:**
```
✓ Created 25 cities
✓ Created 8 categories
✓ Migration complete!
```

---

## Step 3: Verify the Migration

Check that data was migrated correctly:

```bash
python3 scripts/verify_migration.py
```

This will show you:
- Number of records in each new table
- Sample data from each table
- Any issues or warnings

---

## Step 4: Update Application Code (Optional)

Once you're happy with the new tables, you can update the application to use them. This is **completely optional** - your site will work fine with or without this step.

The updated code is in:
- `app/page.tsx` (uses new cities/categories tables)
- `lib/supabase-queries.ts` (new helper functions)

---

## Rollback Plan

If anything goes wrong, you can safely delete the new tables:

```sql
DROP TABLE IF EXISTS public.list_destinations;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.cities;
```

Your site will continue working exactly as before since it doesn't use these tables yet.

---

## Timeline

- **Step 1:** 2 minutes (create tables)
- **Step 2:** 5 minutes (populate data)
- **Step 3:** 1 minute (verify)
- **Step 4:** Optional (update code when ready)

**Total:** ~10 minutes of work

---

## Questions?

If you see any errors or have questions, stop and let me know. We can troubleshoot together before proceeding.

Ready to start? Begin with **Step 1** above! 🚀

