# Near Me Filter - Troubleshooting Guide

## Issue: "Near Me isn't working"

The Near Me filter requires some setup to work properly. Here's how to diagnose and fix the issue:

---

## Step 1: Check Browser Console

Open your browser's developer console (F12) and look for messages starting with `[Near Me]`.

### What you might see:

**✅ Good:**
```
[Near Me] Fetching destinations within 5km of 40.7128, -74.0060
[Near Me] Found 12 destinations (using fallback)
```

**❌ Problem - No coordinates:**
```
[Near Me] Found 0 destinations
```

**❌ Problem - Database error:**
```
[Near Me] API error: Failed to fetch destinations
```

---

## Step 2: Quick Diagnosis

### Problem A: "Found 0 destinations"

**Cause:** Your destinations don't have latitude/longitude coordinates yet.

**Solutions:**

1. **Run the database migration** (adds lat/lng columns):
   ```sql
   -- In Supabase SQL Editor, run:
   /supabase/migrations/500_complete_travel_intelligence.sql
   ```

2. **Manually add coordinates** for a few test destinations:
   ```sql
   -- Example: Add coordinates for destinations in Tokyo
   UPDATE destinations
   SET latitude = 35.6762, longitude = 139.6503
   WHERE city = 'tokyo' AND slug = 'your-destination-slug';
   ```

3. **Or populate all destinations** using Google Places API:
   - See `/DEPLOYMENT_GUIDE.md` Step 5 for the complete script

### Problem B: "Database error" or API fails

**Cause:** The latitude/longitude columns don't exist in your database yet.

**Solution:** Run the database migration (see Problem A, solution 1)

### Problem C: Near Me toggle doesn't request location

**Cause:** You're not on HTTPS or browser blocked permissions

**Solutions:**
- **Localhost:** Should work fine (http://localhost:3000)
- **Production:** Must use HTTPS
- **Check permissions:** Click the lock icon in your browser's address bar and allow location access

---

## Step 3: Test with Coordinates

Once you've added coordinates to at least one destination:

1. Open the site
2. Click the filters button (top right of grid)
3. Toggle "Near Me" on
4. Allow location permission when prompted
5. Check the browser console for `[Near Me]` logs
6. You should see destinations appear with distance badges

---

## Quick Test Setup

Want to test quickly? Add coordinates to one destination:

```sql
-- Add coordinates for one test destination
UPDATE destinations
SET latitude = YOUR_CITY_LAT, longitude = YOUR_CITY_LNG
WHERE slug = 'some-destination';
```

Replace with your actual location's coordinates (use Google Maps to find them).

Then:
1. Toggle Near Me
2. Set radius to 25km (maximum)
3. You should see that destination appear!

---

## What's Implemented

✅ **Frontend:**
- Near Me toggle in filter popup
- Radius slider (0.5km - 25km)
- Distance badges on cards
- Geolocation with browser API
- Error handling & helpful messages

✅ **Backend:**
- API endpoint with fallback (works without migration)
- Haversine distance calculation
- Efficient database function (when migration is run)

⏳ **Needs Setup:**
- Database columns (run migration)
- Destination coordinates (populate data)

---

## Current Status

The code is **100% complete** and will work as soon as:
1. Database has latitude/longitude columns (migration run)
2. At least some destinations have coordinates

The feature gracefully handles missing data and shows helpful error messages.

---

## Need Help?

Check these files for more details:
- `/DEPLOYMENT_GUIDE.md` - Complete setup instructions
- `/IMPLEMENTATION_STATUS.md` - Feature status
- `app/api/nearby/route.ts` - API implementation with fallback

**Note:** The Near Me feature is production-ready code. It just needs the database and data to be set up following the deployment guide.
