# Multi-Location POIs Guide

## Overview

Urban Manual supports POIs with **multiple locations within the same city**. This allows you to:

- Feature **one entry** for a brand/concept in city guides (e.g., "Blue Bottle Coffee")
- Provide **all physical locations** for users to choose from
- Mark a **primary/flagship location** shown in search results
- Prevent clutter in city guides with duplicate entries

## Use Cases

### ✅ Perfect For:

1. **Coffee shops with multiple branches**
   - Blue Bottle Coffee in San Francisco (10+ locations)
   - Stumptown Coffee in Portland (5+ locations)

2. **Restaurant chains within a city**
   - Joe's Pizza in NYC (3 locations)
   - Sweetgreen in DC (15+ locations)

3. **Hotel brands with multiple properties in same city**
   - Ace Hotel in NYC (2 locations)
   - Soho House in London (multiple locations)

### ❌ Not For:

- **Chains across different cities** → Use the `brand` field instead
- **Nested venues** (bar inside hotel) → Use `parent_destination_id` instead
- **Same exact location** → Just one destination entry

## Data Model

### Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `location_group_id` | INTEGER | Groups multiple locations (same for all locations) |
| `is_primary_location` | BOOLEAN | Marks the flagship location |
| `location_identifier` | TEXT | Distinguishes locations ("Ferry Building", "Hayes Valley") |

### Example Data

```sql
-- Blue Bottle Coffee in San Francisco

-- Location 1 (Primary)
INSERT INTO destinations (name, city, brand, location_group_id, is_primary_location, location_identifier, ...)
VALUES ('Blue Bottle Coffee', 'San Francisco', 'Blue Bottle Coffee', 1001, true, 'Ferry Building', ...);

-- Location 2
INSERT INTO destinations (name, city, brand, location_group_id, is_primary_location, location_identifier, ...)
VALUES ('Blue Bottle Coffee', 'San Francisco', 'Blue Bottle Coffee', 1001, false, 'Hayes Valley', ...);

-- Location 3
INSERT INTO destinations (name, city, brand, location_group_id, is_primary_location, location_identifier, ...)
VALUES ('Blue Bottle Coffee', 'San Francisco', 'Blue Bottle Coffee', 1001, false, 'Mint Plaza', ...);
```

## Admin CMS Usage

### Creating a Location Group

1. **Add all locations as separate destinations**
   - Create each physical location normally
   - Set proper coordinates, addresses, etc.

2. **Assign a Location Group ID**
   - Go to the **Location tab** in the destination editor
   - Scroll to "Multi-Location Settings"
   - Set the same `location_group_id` for all locations (e.g., 1001)

3. **Set Location Identifiers**
   - Give each location a unique identifier:
     - "Ferry Building"
     - "Hayes Valley"
     - "Mint Plaza"
     - "Downtown"

4. **Mark the Primary Location**
   - Toggle "Primary/Flagship Location" ON for the main location
   - This will appear in city guides and search results
   - Only ONE location should be primary per group

### Using the API

```typescript
// Create a location group
POST /api/admin/location-groups
{
  "destinationIds": [123, 456, 789],
  "primaryLocationId": 123
}

// Change primary location
PUT /api/admin/location-groups
{
  "groupId": 1001,
  "newPrimaryId": 456
}

// Remove from group
DELETE /api/admin/location-groups?destinationId=789
```

## Frontend Integration

### Display All Locations

```tsx
import { LocationGroupSelector } from '@/components/LocationGroupSelector';
import { getDestinationBySlugWithLocationGroup } from '@/lib/supabase/location-groups';

// In your destination page component
const result = await getDestinationBySlugWithLocationGroup(supabase, slug);

<LocationGroupSelector
  destinations={result.allLocations}
  currentDestination={result.destination}
  showMap={true}
/>
```

### Get Locations for API Route

```typescript
// app/api/destinations/[slug]/location-group/route.ts
import { getDestinationBySlugWithLocationGroup } from '@/lib/supabase/location-groups';

const result = await getDestinationBySlugWithLocationGroup(supabase, slug);

return NextResponse.json({
  destination: result.destination,
  allLocations: result.allLocations,
  locationCount: result.allLocations.length,
  isMultiLocation: result.allLocations.length > 1,
});
```

### City Guide Queries

Use the `city_guide_destinations` view to show only primary locations:

```typescript
import { getCityGuideDestinations } from '@/lib/supabase/location-groups';

// Get destinations for city guide (primary locations only)
const destinations = await getCityGuideDestinations(supabase, 'San Francisco');
```

Or query directly:

```typescript
const { data } = await supabase
  .from('city_guide_destinations')
  .select('*')
  .eq('city', 'San Francisco');
```

## Helper Functions

### Available Functions

```typescript
// Get all locations in a group
getLocationGroupDestinations(supabase, groupId)

// Get destination with all its sibling locations
getDestinationWithLocationGroup(supabase, destinationId)

// Get by slug with all locations
getDestinationBySlugWithLocationGroup(supabase, slug)

// Get primary location for a group
getPrimaryLocation(supabase, groupId)

// Count locations in a group
countLocationGroupSize(supabase, groupId)

// Create a new location group
createLocationGroup(supabase, destinationIds, primaryLocationId)

// Remove from location group
removeFromLocationGroup(supabase, destinationId)

// Change primary location
setPrimaryLocation(supabase, groupId, newPrimaryId)

// Get city guide destinations (primary only)
getCityGuideDestinations(supabase, city)
```

## Database Functions

### SQL Functions Available

```sql
-- Get all locations in a group
SELECT * FROM get_location_group_destinations(1001);

-- Get primary location
SELECT * FROM get_primary_location(1001);

-- Count locations
SELECT count_location_group_size(1001);
```

### City Guide View

```sql
-- View that shows only primary locations
SELECT * FROM city_guide_destinations WHERE city = 'San Francisco';
```

## Best Practices

### 1. Choosing a Location Group ID

- Use a unique number not already in use
- Suggestion: Use the ID of the first destination created
- Or use a high number (e.g., 10000+) to avoid conflicts

### 2. Setting Primary Locations

- **Flagship stores** should be primary
- **Most central** location works well
- **Most popular** location (highest ratings)
- Only **ONE primary per group**

### 3. Location Identifiers

Good identifiers:
- ✅ "Ferry Building"
- ✅ "Hayes Valley"
- ✅ "Downtown"
- ✅ "SoHo"

Bad identifiers:
- ❌ "Location 1"
- ❌ "Store #2"
- ❌ "Blue Bottle"

### 4. When NOT to Use Location Groups

- **Different cities**: Use `brand` field + separate entries
- **Nested venues**: Use `parent_destination_id` (bar in hotel)
- **Temporary locations**: Just create separate entries
- **Pop-ups**: Don't group with permanent locations

## Migration Example

### Before: Separate Entries Cluttering City Guide

```
San Francisco Restaurants:
1. Blue Bottle Coffee - Ferry Building
2. Blue Bottle Coffee - Hayes Valley
3. Blue Bottle Coffee - Mint Plaza
4. Tartine Bakery
5. Blue Bottle Coffee - SFMOMA
... (cluttered with duplicates)
```

### After: Clean City Guide

```
San Francisco Coffee:
1. Blue Bottle Coffee (4 locations) ← Primary location shown
2. Tartine Bakery
3. Sightglass Coffee
... (clean, one entry per concept)
```

Users click on "Blue Bottle Coffee" and see all 4 locations with a map.

## UI Components

### LocationGroupSelector

Shows all locations with:
- Primary location badge
- Address for each location
- Phone numbers, directions, website links
- Selection state
- Optional map view

```tsx
<LocationGroupSelector
  destinations={allLocations}
  currentDestination={currentDestination}
  onSelectLocation={(dest) => console.log('Selected:', dest)}
  showMap={true}
/>
```

## Troubleshooting

### Issue: Primary location not showing in city guide

**Solution**:
1. Verify `is_primary_location = true` for exactly ONE location
2. Check that `parent_destination_id IS NULL` (not a nested venue)
3. Refresh the `city_guide_destinations` view

### Issue: Locations showing separately in search

**Solution**:
1. Ensure all locations have the **same** `location_group_id`
2. Check search logic is using `city_guide_destinations` view
3. Verify only one location has `is_primary_location = true`

### Issue: Can't find location group ID

**Solution**:
```sql
-- Find all location groups
SELECT location_group_id, COUNT(*) as location_count,
       array_agg(name) as locations
FROM destinations
WHERE location_group_id IS NOT NULL
GROUP BY location_group_id
ORDER BY location_count DESC;
```

## Examples

### Complete Example: Blue Bottle Coffee in SF

```typescript
// Step 1: Create locations (via admin CMS or API)
const locations = [
  { name: 'Blue Bottle Coffee', location_identifier: 'Ferry Building', ... },
  { name: 'Blue Bottle Coffee', location_identifier: 'Hayes Valley', ... },
  { name: 'Blue Bottle Coffee', location_identifier: 'Mint Plaza', ... },
];

// Step 2: Group them
await createLocationGroup(supabase, [101, 102, 103], 101); // 101 is primary

// Step 3: Display on destination page
const result = await getDestinationBySlugWithLocationGroup(supabase, 'blue-bottle-coffee-sf');

// result.destination = Primary location (Ferry Building)
// result.allLocations = [Ferry Building, Hayes Valley, Mint Plaza]
```

## Related Features

- **Nested Destinations**: Use `parent_destination_id` for bars in hotels
- **Brands**: Use `brand` field for chains across cities
- **Neighborhoods**: Use `neighborhood` for location context

---

**Need help?** Check the admin CMS or ask in #engineering-support
