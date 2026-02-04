# "Near Me" Filter Implementation Plan
**Priority:** HIGH (Quick Win!)
**Timeline:** 2-3 days
**Impact:** Enables location-aware discovery for travelers

---

## 🎯 Goal

Add geolocation-based filtering so users can discover amazing places near their current location - essential for travelers exploring a new city.

---

## 📋 Features to Implement

### Core Functionality
1. ✅ Get user's current location (with permission)
2. ✅ Calculate distances from user to destinations
3. ✅ Filter results by distance radius
4. ✅ Sort by distance (nearest first)
5. ✅ Show distance on destination cards
6. ✅ "Near Me" toggle/button in UI

### Advanced Features (Phase 2)
- Walking time estimates (not just distance)
- Public transit options
- "Within X minutes walk" filter
- Map view with user's location marker
- Live location updates as user moves

---

## 🗄️ Database Updates

### Add Coordinates to Destinations

```sql
-- Add latitude/longitude columns if not present
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add spatial index for fast distance queries
CREATE INDEX IF NOT EXISTS idx_destinations_location
  ON destinations USING GIST (
    ll_to_earth(latitude, longitude)
  );

-- Enable earthdistance extension for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Function to calculate distance in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN earth_distance(
    ll_to_earth(lat1, lon1),
    ll_to_earth(lat2, lon2)
  ) / 1000; -- Convert meters to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing destinations with coordinates from Google Places
-- This will be done via a migration script
```

### Migration Script to Populate Coordinates

**File:** `/scripts/populate-coordinates.ts`
```typescript
/**
 * Populate coordinates for destinations from Google Places API
 * Run once to backfill existing destinations
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function populateCoordinates() {
  // Get destinations without coordinates
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, slug, name, city, place_id, latitude, longitude')
    .or('latitude.is.null,longitude.is.null');

  if (!destinations) {
    console.log('No destinations need coordinate updates');
    return;
  }

  console.log(`Updating coordinates for ${destinations.length} destinations...`);

  let updated = 0;
  let failed = 0;

  for (const dest of destinations) {
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // Try using place_id if available
      if (dest.place_id) {
        const placeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${dest.place_id}&fields=geometry&key=${GOOGLE_API_KEY}`
        );
        const placeData = await placeResponse.json();

        if (placeData.result?.geometry?.location) {
          lat = placeData.result.geometry.location.lat;
          lng = placeData.result.geometry.location.lng;
        }
      }

      // Fall back to geocoding by name and city
      if (!lat || !lng) {
        const query = encodeURIComponent(`${dest.name}, ${dest.city}`);
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_API_KEY}`
        );
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.results?.[0]?.geometry?.location) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
        }
      }

      // Update destination
      if (lat && lng) {
        const { error } = await supabase
          .from('destinations')
          .update({ latitude: lat, longitude: lng })
          .eq('id', dest.id);

        if (error) {
          console.error(`Failed to update ${dest.slug}:`, error);
          failed++;
        } else {
          updated++;
          console.log(`✓ Updated ${dest.slug} (${lat}, ${lng})`);
        }
      } else {
        console.log(`✗ Could not find coordinates for ${dest.slug}`);
        failed++;
      }

      // Rate limiting - Google has 50 requests/second limit
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing ${dest.slug}:`, error);
      failed++;
    }
  }

  console.log(`\nComplete! Updated: ${updated}, Failed: ${failed}`);
}

populateCoordinates();
```

---

## 🔧 Backend Implementation

### Distance Calculation API

**File:** `/app/api/nearby/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '5'); // km
    const limit = parseInt(searchParams.get('limit') || '50');
    const city = searchParams.get('city'); // Optional city filter
    const category = searchParams.get('category'); // Optional category filter

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Build query with distance calculation
    let query = supabase.rpc('destinations_nearby', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
      result_limit: limit
    });

    // Apply additional filters
    if (city) {
      query = query.eq('city', city);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: destinations, error } = await query;

    if (error) {
      console.error('Error fetching nearby destinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch nearby destinations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      destinations: destinations || [],
      userLocation: { lat, lng },
      radius,
      count: destinations?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in nearby API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

### Database Function for Nearby Search

```sql
-- Function to find destinations within radius
CREATE OR REPLACE FUNCTION destinations_nearby(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km DECIMAL,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  content TEXT,
  image TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  rating DECIMAL,
  price_level INT,
  michelin_stars INT,
  crown BOOLEAN,
  distance_km DECIMAL,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    d.description,
    d.content,
    d.image,
    d.latitude,
    d.longitude,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.crown,
    calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude) as distance_km,
    (calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude) * 0.621371) as distance_miles
  FROM destinations d
  WHERE
    d.latitude IS NOT NULL
    AND d.longitude IS NOT NULL
    AND earth_box(ll_to_earth(user_lat, user_lng), radius_km * 1000) @> ll_to_earth(d.latitude, d.longitude)
    AND earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) <= radius_km * 1000
  ORDER BY distance_km ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🎨 Frontend Implementation

### Geolocation Hook

**File:** `/hooks/useGeolocation.ts`
```typescript
'use client';

import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  accuracy: number | null;
  permissionGranted: boolean | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    accuracy: null,
    permissionGranted: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        permissionGranted: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permissionGranted: true,
        });

        // Store in localStorage for persistence
        localStorage.setItem('user_location', JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        }));
      },
      (error) => {
        let errorMessage = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionGranted: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Check for cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        const { lat, lng, timestamp } = JSON.parse(cached);
        // Use cached location if less than 30 minutes old
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setState({
            latitude: lat,
            longitude: lng,
            error: null,
            loading: false,
            accuracy: null,
            permissionGranted: true,
          });
        }
      } catch (e) {
        // Invalid cache, ignore
      }
    }
  }, []);

  return {
    ...state,
    requestLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
```

### Near Me Filter Component

**File:** `/components/NearMeFilter.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface Props {
  onLocationChange: (lat: number | null, lng: number | null, radius: number) => void;
  onToggle?: (enabled: boolean) => void;
}

export function NearMeFilter({ onLocationChange, onToggle }: Props) {
  const { latitude, longitude, error, loading, requestLocation, hasLocation, permissionGranted } = useGeolocation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [radius, setRadius] = useState(5); // km
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);

  useEffect(() => {
    if (isEnabled && hasLocation && latitude && longitude) {
      onLocationChange(latitude, longitude, radius);
      onToggle?.(true);
    } else if (!isEnabled) {
      onLocationChange(null, null, radius);
      onToggle?.(false);
    }
  }, [isEnabled, hasLocation, latitude, longitude, radius]);

  const handleToggle = () => {
    if (!isEnabled) {
      // Turning ON - request location
      if (!hasLocation) {
        requestLocation();
      }
      setIsEnabled(true);
    } else {
      // Turning OFF
      setIsEnabled(false);
      setShowRadiusSlider(false);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km}km`;
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-2 ${
          isEnabled && hasLocation
            ? 'bg-black dark:bg-white text-white dark:text-black'
            : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Getting location...</span>
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            <span>Near Me</span>
            {isEnabled && hasLocation && (
              <>
                <span className="text-xs opacity-75">({formatDistance(radius)})</span>
                <X className="h-3 w-3 ml-1" />
              </>
            )}
          </>
        )}
      </button>

      {/* Radius Slider */}
      {isEnabled && hasLocation && (
        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-lg z-10 min-w-[280px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Search radius</span>
              <span className="font-medium">{formatDistance(radius)}</span>
            </div>

            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>500m</span>
              <span>25km</span>
            </div>

            {latitude && longitude && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-800">
                📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && isEnabled && (
        <div className="absolute top-full mt-2 left-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 shadow-lg z-10 min-w-[280px]">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {permissionGranted === false && (
            <p className="text-xs text-red-500 dark:text-red-500 mt-2">
              Please enable location access in your browser settings
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Distance Badge Component

**File:** `/components/DistanceBadge.tsx`
```typescript
'use client';

import { Navigation } from 'lucide-react';

interface Props {
  distanceKm: number;
  compact?: boolean;
}

export function DistanceBadge({ distanceKm, compact = false }: Props) {
  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    if (km < 10) {
      return `${km.toFixed(1)}km`;
    }
    return `${Math.round(km)}km`;
  };

  const getWalkingTime = (km: number): string | null => {
    const walkingSpeedKmH = 5; // Average walking speed
    const minutes = Math.round((km / walkingSpeedKmH) * 60);

    if (minutes < 5) return null; // Too short to display
    if (minutes < 60) return `${minutes} min walk`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0
      ? `${hours}h ${remainingMins}m walk`
      : `${hours}h walk`;
  };

  const walkingTime = getWalkingTime(distanceKm);

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
        <Navigation className="h-3 w-3" />
        <span>{formatDistance(distanceKm)}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
      <Navigation className="h-3 w-3 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-blue-600">
          {formatDistance(distanceKm)}
        </span>
        {walkingTime && (
          <span className="text-xs text-blue-500">
            {walkingTime}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 🔌 Integration with Existing Features

### Update Homepage (app/page.tsx)

```typescript
import { NearMeFilter } from '@/components/NearMeFilter';
import { DistanceBadge } from '@/components/DistanceBadge';

export default function Home() {
  // ... existing state ...
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyRadius, setNearbyRadius] = useState(5);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

  // Fetch nearby destinations
  const fetchNearbyDestinations = async (lat: number, lng: number, radius: number) => {
    try {
      const response = await fetch(
        `/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`
      );
      const data = await response.json();

      setNearbyDestinations(data.destinations || []);
    } catch (error) {
      console.error('Error fetching nearby destinations:', error);
    }
  };

  const handleLocationChange = (lat: number | null, lng: number | null, radius: number) => {
    if (lat && lng) {
      setUserLocation({ lat, lng });
      setNearbyRadius(radius);
      fetchNearbyDestinations(lat, lng, radius);
    } else {
      setUserLocation(null);
      setNearbyDestinations([]);
    }
  };

  // Update displayed destinations based on near me filter
  const displayDestinations = nearMeEnabled && nearbyDestinations.length > 0
    ? nearbyDestinations
    : filteredDestinations;

  return (
    <main>
      {/* Add Near Me filter next to existing filters */}
      <div className="flex items-center gap-3">
        <NearMeFilter
          onLocationChange={handleLocationChange}
          onToggle={setNearMeEnabled}
        />

        <SearchFiltersComponent
          // ... existing props ...
        />
      </div>

      {/* Show count when near me is active */}
      {nearMeEnabled && userLocation && (
        <div className="my-4 text-sm text-gray-600 dark:text-gray-400">
          Found {nearbyDestinations.length} places within {nearbyRadius}km
        </div>
      )}

      {/* Grid with distance badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {displayDestinations.map((destination, index) => (
          <div key={destination.slug}>
            {/* Existing card content */}

            {/* Add distance badge if near me is active */}
            {nearMeEnabled && destination.distance_km && (
              <div className="mt-2">
                <DistanceBadge distanceKm={destination.distance_km} compact />
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
```

### Update Destination Type

```typescript
// types/destination.ts

export interface Destination {
  // ... existing fields ...
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number; // Added by nearby query
  distance_miles?: number; // Added by nearby query
}
```

---

## 🎯 User Experience Flow

### First Time User
1. User lands on homepage
2. Sees "Near Me" button (unactivated)
3. Clicks "Near Me"
4. Browser prompts for location permission
5. User grants permission
6. Page shows destinations sorted by distance
7. Each card shows distance badge

### Returning User
1. Homepage loads
2. If location was previously granted, "Near Me" remembers (via localStorage)
3. User can quickly toggle on/off
4. Adjust radius with slider

### Mobile Experience
1. "Near Me" is more prominent on mobile
2. Larger touch targets
3. Quick access from bottom of screen
4. Integration with device location services

---

## 📱 Mobile Enhancements

### Add to Mobile Navigation

```typescript
// Bottom navigation bar
<div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
  <div className="flex items-center justify-around p-2">
    <button className="p-3">
      <Home className="h-5 w-5" />
    </button>

    <button className="p-3">
      <Search className="h-5 w-5" />
    </button>

    <button
      onClick={handleNearMeToggle}
      className={`p-3 rounded-full ${nearMeEnabled ? 'bg-black text-white' : ''}`}
    >
      <MapPin className="h-5 w-5" />
    </button>

    <button className="p-3">
      <User className="h-5 w-5" />
    </button>
  </div>
</div>
```

---

## 🧪 Testing Checklist

- [ ] Location permission granted successfully
- [ ] Location permission denied handled gracefully
- [ ] Distance calculations are accurate
- [ ] Radius slider updates results in real-time
- [ ] Distance badges display correctly
- [ ] Walking time estimates are reasonable
- [ ] Cached location loads correctly
- [ ] Works on mobile devices
- [ ] Works on desktop browsers
- [ ] Error states display properly
- [ ] Performance: < 1s to load nearby results
- [ ] Accessibility: keyboard navigation works

---

## 🚀 Quick Implementation Steps

### Day 1: Database & Backend
1. ✅ Add coordinates columns to destinations table
2. ✅ Create database function `destinations_nearby`
3. ✅ Run migration script to populate coordinates
4. ✅ Create `/api/nearby` endpoint
5. ✅ Test API with sample coordinates

### Day 2: Frontend Components
1. ✅ Create `useGeolocation` hook
2. ✅ Create `NearMeFilter` component
3. ✅ Create `DistanceBadge` component
4. ✅ Test components in isolation

### Day 3: Integration & Polish
1. ✅ Integrate into homepage
2. ✅ Add mobile-specific enhancements
3. ✅ Handle error states
4. ✅ Test end-to-end flow
5. ✅ Polish UI/UX
6. ✅ Deploy and monitor

---

## 💡 Advanced Features (Future)

### Phase 2 Enhancements
- **Public Transit Integration**
  - "15 min by metro" estimates
  - Transit route suggestions
  - Real-time transit delays

- **Walking Routes**
  - Show actual walking path
  - Scenic route option
  - Accessibility-friendly routes

- **Location History**
  - Remember frequently visited areas
  - "You're usually near [neighborhood]"
  - Smart suggestions based on movement patterns

- **Group Location**
  - "Meet in the middle" for friends
  - Show places equidistant for group
  - Collaborative location sharing

---

## 📊 Success Metrics

### Usage Metrics
- **Near Me Adoption:** % of users who enable near me
- **Location Permission Rate:** % who grant permission
- **Radius Adjustments:** Average radius used
- **Results Per Search:** Destinations found per near me search

### Engagement
- **Click-Through Rate:** % who click destinations from near me results
- **Visit Rate:** % who mark as visited after near me discovery
- **Repeat Usage:** % who use near me multiple times

---

## 💰 Cost Estimate

### APIs
- **Google Maps Geocoding API:** ~$5 per 1000 requests
  - One-time backfill: 897 destinations = ~$4.50
  - Ongoing: Minimal (only for new destinations)

- **Google Distance Matrix API (if used for transit):**
  - ~$5-10 per 1000 requests
  - Optional for advanced features

**Total:** ~$5 one-time + negligible ongoing

---

## ✅ Ready to Implement!

This is a **quick win** that significantly enhances the user experience for travelers. The implementation is straightforward and builds on existing infrastructure.

**Recommended Start:** Day 1 Database setup, then proceed to frontend

---

*Need help with any specific part? I can provide more detailed code or guidance!*
