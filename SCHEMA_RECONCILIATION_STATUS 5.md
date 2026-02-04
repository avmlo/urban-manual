# Schema Reconciliation Status

## ✅ Completed

1. **Migrations Created:**
   - `019_audit_current_state.sql` - Audit script to check current schema
   - `020_consolidate_schema.sql` - Consolidates to `saved_places`/`visited_places`
   - `021_add_helper_functions.sql` - Helper RPC functions for queries

2. **Supporting Files:**
   - `types/database.ts` - TypeScript types for new schema
   - `scripts/run-migrations.sh` - Migration runner script

3. **Frontend Code:**
   - ✅ `app/account/page.tsx` - Already uses `saved_places`/`visited_places`
   - ✅ `components/DestinationDrawer.tsx` - Already uses `saved_places`/`visited_places`
   - ✅ `app/city/[city]/page-client.tsx` - Already uses `saved_places`/`visited_places`
   - ✅ `app/page.tsx` - Already uses `visited_places`
   - ✅ `lib/recommendations.ts` - Already uses `saved_places`/`visited_places`

## 🔄 Needs Update

The following files still reference `saved_destinations` (which uses `destination_id`) and need to be updated to use `saved_places` (which uses `destination_slug`):

1. **High Priority:**
   - `lib/popularity.ts` - Used for popularity calculations
   - `lib/achievements.ts` - Used for achievement tracking
   - `services/intelligence/recommendations-advanced.ts` - AI recommendations
   - `app/api/account/insights/route.ts` - User insights API

2. **Medium Priority:**
   - `lib/ai-recommendations/profile-extractor.ts` - User profile extraction
   - `lib/ai-recommendations/candidate-selector.ts` - Candidate selection
   - `lib/discovery-prompts-generative.ts` - Discovery prompts

3. **Low Priority (Collections Feature):**
   - `components/SaveDestinationModal.tsx` - Uses `destination_id` for collections
   - `hooks/useCollections.ts` - Collections management
   - `components/CollectionsManager.tsx` - Collections UI
   - `lib/tracking.ts` - Analytics tracking

4. **Scripts/Migration:**
   - `scripts/merge-cities.ts` - One-time migration script (can keep old table names)

## 📝 Migration Notes

### Key Schema Changes:
- **Old:** `saved_destinations.destination_id` (INTEGER)
- **New:** `saved_places.destination_slug` (TEXT)
- **Old:** `visited_destinations.destination_id` (INTEGER)  
- **New:** `visited_places.destination_slug` (TEXT)

### Helper Functions Available:
- `get_user_saved_destinations(user_id)` - Returns joined data with destination details
- `get_user_visited_destinations(user_id)` - Returns joined data with destination details
- `get_destination_user_status(user_id, destination_slug)` - Returns save/visit status

### Update Pattern:
```typescript
// OLD (destination_id)
.from('saved_destinations')
.select('destination_id')
.eq('destination_id', id)

// NEW (destination_slug)
.from('saved_places')
.select('destination_slug')
.eq('destination_slug', slug)

// OR use helper function
.rpc('get_user_saved_destinations', { target_user_id: userId })
```

## 🎯 Next Steps

1. Run the migrations in Supabase SQL Editor:
   - `019_audit_current_state.sql` - Check current state
   - `020_consolidate_schema.sql` - Consolidate schema
   - `021_add_helper_functions.sql` - Add helper functions

2. Update code references (see list above)

3. Test the application:
   - Save/unsave destinations
   - Mark destinations as visited
   - View saved/visited lists
   - Check achievements
   - Verify popularity calculations

4. Consider dropping old tables after validation:
   - `saved_destinations` (if migration successful)
   - `visited_destinations` (if migration successful)

