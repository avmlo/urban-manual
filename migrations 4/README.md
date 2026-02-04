# Database Migrations

This folder contains SQL migration files that need to be run in your Supabase database.

## ⚠️ CRITICAL: Required Migrations

All features including **Trips**, **Feed**, **Lists**, and **Reviews** require these migrations to be run in Supabase.

### 1. Saved and Visited Places (saved_visited_places.sql)
**Status:** MUST RUN FIRST
**Purpose:** Creates tables for saving and tracking visited destinations

**Enables:**
- Saving favorite destinations
- Marking destinations as visited
- User-specific saved/visited lists on account page
- Heart/check icons in DestinationDrawer

### 2. Trips and Itinerary (trips.sql)
**Status:** MUST RUN
**Purpose:** Creates tables for trip planning functionality

**Enables:**
- Creating and managing trips
- Building itineraries
- Trip planning page at /trips
- Trip viewing in account page

### 3. Social Features (social-features.sql)
**Status:** MUST RUN FOR FEED, LISTS, REVIEWS
**Purpose:** Creates all social feature tables

**Enables:**
- **Feed Page** - Activity feed showing user actions
- **Lists Page** - Create and manage destination lists
- **Reviews** - Write and view reviews for destinations
- Following system (future)
- Notifications (future)
- Comments on reviews (future)

**Tables Created:**
- `user_profiles` - User profile data
- `follows` - User following system
- `lists` - User lists
- `list_items` - Destinations in lists
- `list_likes` - List likes
- `reviews` - Destination reviews
- `review_helpful` - Review helpful votes
- `comments` - Comments on reviews
- `notifications` - User notifications
- `activities` - Activity feed data

## How to Run Migrations

1. Go to your **Supabase project dashboard**
2. Navigate to the **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy the contents of each migration file (in order below)
5. Paste into the SQL Editor
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. Verify success (you should see "Success. No rows returned")

## Migration Order (IMPORTANT)

Run migrations in this exact order:

```
1. saved_visited_places.sql  - Core user functionality
2. trips.sql                  - Trip planning
3. social-features.sql        - Feed, Lists, Reviews, Activities
```

## Verification

After running migrations, verify tables were created:
1. Go to **Table Editor** in Supabase
2. You should see these new tables:

**Core:**
- ✅ `saved_places`
- ✅ `visited_places`

**Trips:**
- ✅ `trips`
- ✅ `itinerary_items`

**Social:**
- ✅ `user_profiles`
- ✅ `follows`
- ✅ `lists`
- ✅ `list_items`
- ✅ `list_likes`
- ✅ `reviews`
- ✅ `review_helpful`
- ✅ `comments`
- ✅ `notifications`
- ✅ `activities`

## Features Enabled After Migrations

### ✅ Immediately Available
- **AI Chat Assistant** - On home page (no DB required)
- **Account Page** - Stats and collections (with saved/visited migrations)
- **Cities & Destinations** - Full browsing (no DB required)
- **Dark Mode** - Theme switching (no DB required)

### ✅ After Running Migrations
- **Feed Page** - Social activity feed
- **Lists Page** - Create and manage lists
- **Trips Page** - Full trip planning
- **Reviews** - Rate and review destinations (future integration)
- **Saved/Visited Tracking** - Heart and check buttons

## Troubleshooting

### Migration fails with "already exists" error
**Solution:** This is normal if you've run the migration before. The migrations use `IF NOT EXISTS` to prevent errors. Safe to ignore.

### Migration fails with RLS policy errors
**Solution:** If policies already exist, drop them first:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```
Then re-run the migration.

### Tables don't appear
**Checklist:**
- Refresh the Table Editor page
- Check the SQL Editor for error messages
- Verify you're in the correct Supabase project
- Make sure you clicked "Run" (or pressed Cmd/Ctrl + Enter)

### Features not working after migration
**Checklist:**
- Clear browser cache and reload
- Check browser console for errors
- Verify RLS policies are enabled (should be automatic)
- Test authentication is working

### "Failed to create trip" error
**Cause:** The `trips` table doesn't exist in your database yet.

**Solution:**
1. Go to Supabase SQL Editor
2. Run the `trips.sql` migration (see "How to Run Migrations" above)
3. Verify the `trips` table appears in Table Editor
4. Try creating a trip again

**Note:** The error message will now show detailed information to help you debug

## Support

If you encounter issues:
1. Check the Supabase logs for errors
2. Verify all migrations ran successfully
3. Check that RLS is enabled on all tables
4. Ensure you're logged in when testing features

## File Sizes
- `saved_visited_places.sql` - ~2KB (simple, fast)
- `trips.sql` - ~4KB (medium complexity)
- `social-features.sql` - ~12KB (comprehensive, takes ~5-10 seconds)

## Total Setup Time
Expected: **2-5 minutes** for all migrations
