# Migration Verification Guide

## Step 1: Run SQL Verification Query

Run `VERIFY_OLD_MIGRATIONS.sql` in your Supabase SQL Editor to check which tables exist.

## Step 2: Check What Codebase Expects

### Trips Feature
**Code expects:** `trips` table
- Location: `app/trips/page.tsx`
- Uses: `supabase.from('trips')`
- **Old migration:** `migrations/trips.sql`
- **New migration:** `401_itineraries_system.sql` (in supabase/migrations/)

### Saved/Visited Places
**Code expects:** `saved_places` and `visited_places` tables
- Location: Multiple files use these tables
- **Old migration:** `migrations/saved_visited_places.sql`
- **New migration:** `404_visited_enhancements.sql` (in supabase/migrations/)

### Social Features
**Code expects:** `user_profiles`, `lists` (or `collections`), `reviews`, `activities` (or `activity_feed`)
- **Old migration:** `migrations/social-features.sql`
- **New migration:** `403_social_features.sql` (in supabase/migrations/)

### Achievements
**Code expects:** `user_achievements` or `achievements` table
- **Old migration:** `migrations/011_achievements_system.sql`
- **New migration:** `402_achievements_system.sql` (in supabase/migrations/)

## Step 3: Interpretation

### If ALL tables exist:
✅ Old migrations were either:
- Already applied directly, OR
- Consolidated into new migrations (400-500)

**Action:** Safe to delete old `migrations/` directory

### If SOME tables missing:
⚠️ Old migrations might still be needed

**Action:** 
1. Check which tables are missing
2. Determine if they're in new migrations or need old migrations
3. Apply missing migrations if needed

### If NO tables exist:
❌ Migrations haven't been applied

**Action:** 
1. Apply new migrations (400-500) from `supabase/migrations/`
2. Or apply old migrations from `migrations/` if new ones don't cover it

## Step 4: Compare Old vs New Migrations

### Trips
- **Old:** `migrations/trips.sql` → Creates `trips`, `itinerary_items`
- **New:** `401_itineraries_system.sql` → Creates `itineraries`, `itinerary_days`, `itinerary_items`
- **Note:** New migration uses `itineraries` not `trips` - might be different!

### Saved/Visited
- **Old:** `migrations/saved_visited_places.sql` → Creates `saved_places`, `visited_places`
- **New:** `404_visited_enhancements.sql` → Enhances existing `saved_places`, `visited_places`
- **Note:** New migration assumes tables already exist!

### Social Features
- **Old:** `migrations/social-features.sql` → Creates `lists`, `list_items`
- **New:** `403_social_features.sql` → Creates `collections`, `collection_items`
- **Note:** Different table names! `lists` vs `collections`

## Critical Finding

⚠️ **The new migrations might use DIFFERENT table names!**
- Old: `trips` → New: `itineraries`
- Old: `lists` → New: `collections`

**This means:**
- If code uses `trips` table, old migration is needed
- If code uses `lists` table, old migration is needed
- New migrations might be for different/newer features

## Recommendation

1. **Run the SQL verification** to see what tables exist
2. **Check the codebase** to see what tables it uses
3. **Compare** old vs new migration table names
4. **Decide** based on what your code actually uses

