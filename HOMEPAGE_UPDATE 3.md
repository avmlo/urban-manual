# Homepage Update Instructions
**Adding Near Me + Social Proof + Distance Badges**

---

## Changes Needed in `/app/page.tsx`

### 1. Add Imports (top of file, after existing imports)
```tsx
import { SocialProofBadge } from '@/components/SocialProofBadge';
import { DistanceBadge } from '@/components/DistanceBadge';
```

### 2. Add State Variables (after existing state declarations)
```tsx
// Near Me state
const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);
const [nearMeRadius, setNearMeRadius] = useState(5);
```

### 3. Add Location Handler Function (after existing functions)
```tsx
// Handle location changes from Near Me filter
const handleLocationChange = async (lat: number | null, lng: number | null, radius: number) => {
  if (!lat || !lng) {
    setUserLocation(null);
    setNearbyDestinations([]);
    return;
  }

  setUserLocation({ lat, lng });
  setNearMeRadius(radius);

  try {
    const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`);
    const data = await response.json();

    if (data.destinations) {
      setNearbyDestinations(data.destinations);
    }
  } catch (error) {
    console.error('Error fetching nearby destinations:', error);
  }
};
```

### 4. Update SearchFiltersComponent Usage (find the SearchFiltersComponent line)
```tsx
<SearchFiltersComponent
  filters={advancedFilters}
  onFiltersChange={setAdvancedFilters}
  availableCities={cities}
  availableCategories={categories}
  onLocationChange={handleLocationChange}  // ADD THIS LINE
/>
```

### 5. Update Display Logic (find where filteredDestinations is used for display)

Replace the logic that determines which destinations to show with:
```tsx
// Determine which destinations to show
const displayDestinations = advancedFilters.nearMe && nearbyDestinations.length > 0
  ? nearbyDestinations
  : filteredDestinations;
```

### 6. Add Badges to Destination Cards (in the card rendering section)

Find where you render destination cards (the grid with destination.image, etc.) and add after the title/city section:

```tsx
{/* Social Proof + Distance Badges */}
<div className="mt-2 flex flex-wrap items-center gap-1">
  {destination.distance_km && (
    <DistanceBadge distanceKm={destination.distance_km} compact />
  )}
  <SocialProofBadge
    savesCount={destination.saves_count}
    visitsCount={destination.visits_count}
    compact
  />
</div>
```

---

## Example of Complete Card Rendering

```tsx
<div
  key={destination.slug}
  className={CARD_WRAPPER}
  onClick={() => handleDestinationClick(destination)}
>
  {/* Image */}
  <div className={CARD_MEDIA}>
    <Image
      src={destination.image || '/placeholder.jpg'}
      alt={destination.name}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
    />
    {destination.michelin_stars && (
      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
        ⭐ {destination.michelin_stars}
      </div>
    )}
  </div>

  {/* Title */}
  <h3 className={CARD_TITLE}>{destination.name}</h3>

  {/* Meta (City, Category) */}
  <div className={CARD_META}>
    <span className="text-xs text-gray-600 dark:text-gray-400">
      {capitalizeCity(destination.city)}
    </span>
    {destination.category && (
      <>
        <span className="text-gray-400">•</span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {destination.category}
        </span>
      </>
    )}
  </div>

  {/* Badges - ADD THIS */}
  <div className="mt-2 flex flex-wrap items-center gap-1">
    {destination.distance_km && (
      <DistanceBadge distanceKm={destination.distance_km} compact />
    )}
    <SocialProofBadge
      savesCount={destination.saves_count}
      visitsCount={destination.visits_count}
      compact
    />
  </div>
</div>
```

---

## Testing Checklist

After making these changes:

- [ ] Near Me toggle appears in filter popup
- [ ] Clicking Near Me requests location permission
- [ ] Radius slider adjusts from 0.5km to 25km
- [ ] Nearby destinations load when location is granted
- [ ] Distance badges show on nearby destination cards
- [ ] Social proof badges show on cards with saves/visits
- [ ] Filtering still works correctly
- [ ] Mobile responsive (test on small screen)
- [ ] Dark mode works correctly

---

## Common Issues & Solutions

**Issue:** Near Me filter doesn't show destinations
- **Solution:** Make sure coordinates exist in database (run migration first)
- **Solution:** Check browser console for API errors

**Issue:** Location permission denied
- **Solution:** This is expected behavior - show error message to user
- **Solution:** Works correctly with error handling in filter component

**Issue:** Badges don't show
- **Solution:** Make sure destinations have saves_count/visits_count/distance_km
- **Solution:** Badges only show when data exists (by design)

---

## Complete Code Snippet

Here's the complete section to add to your homepage:

```tsx
// At the top with imports
import { SocialProofBadge } from '@/components/SocialProofBadge';
import { DistanceBadge } from '@/components/DistanceBadge';

// In your component, with other state
const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

// Handler function
const handleLocationChange = async (lat: number | null, lng: number | null, radius: number) => {
  if (!lat || !lng) {
    setUserLocation(null);
    setNearbyDestinations([]);
    return;
  }

  setUserLocation({ lat, lng });

  try {
    const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`);
    const data = await response.json();
    if (data.destinations) {
      setNearbyDestinations(data.destinations);
    }
  } catch (error) {
    console.error('Error fetching nearby destinations:', error);
  }
};

// In your JSX
<SearchFiltersComponent
  filters={advancedFilters}
  onFiltersChange={setAdvancedFilters}
  availableCities={cities}
  availableCategories={categories}
  onLocationChange={handleLocationChange}
/>

// Display logic
const displayDestinations = advancedFilters.nearMe && nearbyDestinations.length > 0
  ? nearbyDestinations
  : filteredDestinations;

// In card rendering (map over displayDestinations)
{displayDestinations.map(destination => (
  <div key={destination.slug}>
    {/* Existing card content */}

    {/* Add badges after title/meta */}
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {destination.distance_km && (
        <DistanceBadge distanceKm={destination.distance_km} compact />
      )}
      <SocialProofBadge
        savesCount={destination.saves_count}
        visitsCount={destination.visits_count}
        compact
      />
    </div>
  </div>
))}
```

---

*These changes enable Near Me filtering and add visual engagement indicators to all destination cards!*
