# Complete Deployment Guide
**Travel Intelligence Features - Full Implementation**

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

**In Supabase SQL Editor:**

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of:
   ```
   /supabase/migrations/500_complete_travel_intelligence.sql
   ```
5. Click "Run" or press `Cmd/Ctrl + Enter`
6. Verify no errors appear
7. Check that new tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'destination_status',
     'crowding_data',
     'price_alerts',
     'user_reports'
   );
   ```

**Expected Output:** All 4 tables should be listed

---

### Step 2: Verify Database Changes

Run these queries to confirm everything is set up:

```sql
-- Check if destinations has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'destinations'
AND column_name IN ('latitude', 'longitude', 'saves_count', 'visits_count', 'opentable_url');

-- Check if nearby function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'destinations_nearby';

-- Check if triggers are active
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_saves_count', 'trigger_update_visits_count');
```

---

### Step 3: Update Homepage Code

**File:** `/app/page.tsx`

Follow the detailed instructions in `/HOMEPAGE_UPDATE.md`:

1. Add imports for SocialProofBadge and DistanceBadge
2. Add state variables for user location and nearby destinations
3. Add handleLocationChange function
4. Update SearchFiltersComponent with onLocationChange prop
5. Update display logic to show nearby destinations when Near Me is active
6. Add badges to destination cards

**Quick reference:**
```tsx
// Add to imports
import { SocialProofBadge } from '@/components/SocialProofBadge';
import { DistanceBadge } from '@/components/DistanceBadge';

// Add state
const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

// Add handler - see HOMEPAGE_UPDATE.md for full code

// Update component
<SearchFiltersComponent
  onLocationChange={handleLocationChange}  // Add this
  // ... other props
/>
```

---

### Step 4: Build and Test Locally

```bash
# Install dependencies (if new)
npm install

# Run build to check for TypeScript errors
npm run build

# If build succeeds, run locally
npm run dev

# Open http://localhost:3000
```

**Test checklist:**
- [ ] Page loads without errors
- [ ] Click filters button - filter popup opens
- [ ] Scroll down in filters - see "Near Me" section
- [ ] Toggle Near Me on - browser asks for location permission
- [ ] Grant permission - radius slider appears
- [ ] Adjust radius slider - range changes (0.5km - 25km)
- [ ] Close and reopen filters - Near Me state persists
- [ ] Look at destination cards - badges appear (if data exists)
- [ ] Test in dark mode - everything looks correct
- [ ] Test on mobile (Chrome DevTools) - UI is responsive

---

### Step 5: Optional - Populate Coordinates

If you want Near Me to work immediately, populate coordinates for existing destinations.

**Option A: Manual Update (Quick Test)**
Update a few destinations manually:
```sql
-- Update some Tokyo destinations with coordinates
UPDATE destinations
SET latitude = 35.6762, longitude = 139.6503
WHERE city = 'tokyo'
LIMIT 10;
```

**Option B: Automated Script (Recommended)**
Create `/scripts/populate-coordinates.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function populateCoordinates() {
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, slug, name, city, place_id')
    .is('latitude', null);

  if (!destinations) {
    console.log('No destinations need updates');
    return;
  }

  console.log(`Updating ${destinations.length} destinations...`);

  for (const dest of destinations) {
    try {
      let lat = null;
      let lng = null;

      if (dest.place_id) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${dest.place_id}&fields=geometry&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();

        if (data.result?.geometry?.location) {
          lat = data.result.geometry.location.lat;
          lng = data.result.geometry.location.lng;
        }
      }

      if (lat && lng) {
        await supabase
          .from('destinations')
          .update({ latitude: lat, longitude: lng })
          .eq('id', dest.id);

        console.log(`✓ ${dest.slug}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    } catch (error) {
      console.error(`✗ ${dest.slug}:`, error);
    }
  }

  console.log('Complete!');
}

populateCoordinates();
```

Run it:
```bash
npx ts-node scripts/populate-coordinates.ts
```

---

### Step 6: Commit and Push

```bash
# Check what's changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: integrate Near Me filter and social proof badges into homepage

- Add Near Me toggle to filter popup with radius slider
- Integrate geolocation with SearchFilters component
- Add SocialProofBadge and DistanceBadge to destination cards
- Handle nearby destinations API calls
- Update display logic for Near Me filtering
- Full mobile responsive and dark mode support"

# Push to your branch
git push
```

---

### Step 7: Deploy to Production

**If using Vercel (recommended):**

1. Merge your branch to main (or deploy from branch)
2. Vercel will automatically build and deploy
3. Check deployment logs for any errors
4. Visit your production URL

**If deploying manually:**
```bash
# Build for production
npm run build

# Deploy (depends on your hosting)
# Vercel: automatic on push
# Other: follow your hosting provider's instructions
```

---

### Step 8: Post-Deployment Verification

Visit your production site and verify:

- [ ] Homepage loads correctly
- [ ] Filters button works
- [ ] Near Me filter is visible in popup
- [ ] Location permission flow works
- [ ] Badges appear on cards (if destinations have data)
- [ ] No console errors
- [ ] Dark mode works
- [ ] Mobile view works

---

## 🔧 Troubleshooting

### Near Me doesn't show destinations

**Check:**
1. Did the database migration run successfully?
2. Do destinations have latitude/longitude values?
3. Is the user's location being detected? (Check browser console)
4. Are there any API errors? (Check Network tab)

**Fix:**
```sql
-- Check how many destinations have coordinates
SELECT COUNT(*) FROM destinations WHERE latitude IS NOT NULL;

-- If 0, you need to populate coordinates (see Step 5)
```

### Badges don't appear

**This is normal if:**
- Destinations don't have saves_count or visits_count yet
- User hasn't granted location (for distance badges)

**To test badges:**
```sql
-- Manually add some engagement data
UPDATE destinations
SET saves_count = 50, visits_count = 30
WHERE id IN (SELECT id FROM destinations LIMIT 10);
```

### Location permission issues

**Common causes:**
- User denied permission (expected behavior - error message shows)
- HTTP (not HTTPS) - geolocation requires HTTPS in production
- Browser doesn't support geolocation

**Solution:**
- Ensure production uses HTTPS
- Error handling is already implemented
- Users will see helpful error messages

### TypeScript errors

**Common errors:**
```
Property 'onLocationChange' does not exist on type...
```

**Fix:**
Make sure you updated the SearchFiltersProps interface:
```tsx
interface SearchFiltersProps {
  // ... existing props
  onLocationChange?: (lat: number | null, lng: number | null, radius: number) => void;
}
```

### Build fails

**Check:**
1. All imports are correct
2. No syntax errors in new code
3. TypeScript types match

```bash
# See specific errors
npm run build 2>&1 | grep error
```

---

## 📊 Monitoring After Deployment

### Check Analytics

Track these metrics after deployment:

1. **Near Me Usage**
   ```sql
   -- How many users enable Near Me?
   -- (Add tracking in your analytics)
   ```

2. **Engagement with Badges**
   - Do more users click on destinations with badges?
   - Track in your analytics system

3. **API Performance**
   ```sql
   -- Check API response times in Vercel/Supabase dashboards
   ```

### Monitor Errors

Watch for:
- Location permission denials (normal, but track rate)
- API timeouts on nearby search
- Database query performance

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Users can toggle Near Me filter in filter popup
✅ Location permission flow works smoothly
✅ Nearby destinations load within 1-2 seconds
✅ Distance badges show on nearby results
✅ Social proof badges show on cards with engagement
✅ No console errors in production
✅ Mobile experience is smooth
✅ Dark mode works correctly

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Revert the homepage changes
git revert HEAD

# Push the revert
git push

# Database changes can stay (they're additive and don't break existing features)
```

---

## 📞 Need Help?

**Check these files:**
- `/IMPLEMENTATION_STATUS.md` - Overall implementation status
- `/HOMEPAGE_UPDATE.md` - Detailed homepage integration guide
- `/NEAR_ME_FILTER_PLAN.md` - Original Near Me plan
- `/DESIGN_SYSTEM.md` - Design guidelines

**Common issues are documented in each file above.**

---

## ✅ Final Checklist

Before marking as complete:

- [ ] Database migration run successfully
- [ ] Homepage code updated
- [ ] Local testing passed
- [ ] Build succeeds with no errors
- [ ] Deployed to production
- [ ] Production testing passed
- [ ] No errors in production logs
- [ ] Mobile testing passed
- [ ] Dark mode testing passed
- [ ] Team notified of new features

---

**Congratulations! Your travel intelligence features are now live! 🎉**
