# Advanced API Enrichment - Implementation Complete ✅

## Overview

All high-value API enrichments have been implemented and integrated into Urban Manual. The platform now fetches and stores rich data from multiple APIs to provide comprehensive travel intelligence.

---

## 📦 What Was Implemented

### 1. **Database Schema** (`supabase/migrations/026_add_advanced_enrichment_fields.sql`)
   - ✅ Photos (Google Places)
   - ✅ Weather data (Open-Meteo)
   - ✅ Events (Eventbrite)
   - ✅ Routes & distances
   - ✅ Static map URLs
   - ✅ Currency exchange rates
   - ✅ Indexes for performance

### 2. **API Integration Libraries** (`lib/enrichment/`)
   - ✅ **photos.ts** - Google Places Photos API
   - ✅ **weather.ts** - Open-Meteo Weather API (free, no key needed)
   - ✅ **routes.ts** - Google Routes API
   - ✅ **distance-matrix.ts** - Google Distance Matrix API
   - ✅ **static-maps.ts** - Google Maps Static API
   - ✅ **events.ts** - Eventbrite API
   - ✅ **currency.ts** - ExchangeRate-API

### 3. **Enrichment Script** (`scripts/enrich-comprehensive.ts`)
   - Comprehensive script that fetches all data types
   - Rate limiting built-in
   - Progress tracking
   - Error handling

### 4. **API Endpoints** (`app/api/`)
   - ✅ `/api/destinations/[slug]/enriched` - Get all enriched data
   - ✅ `/api/routes/calculate` - Calculate routes between destinations
   - ✅ `/api/destinations/nearby` - Find nearby destinations
   - ✅ `/api/weather` - Get weather for a location
   - ✅ `/api/events/nearby` - Find nearby events

---

## 🚀 Quick Start

### Step 1: Run Database Migration

```bash
# Apply the migration to add new columns
supabase migration up 026_add_advanced_enrichment_fields
```

### Step 2: Set Environment Variables

Add to `.env.local`:

```bash
# Already have:
GOOGLE_API_KEY=your_google_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for events):
EVENTBRITE_TOKEN=your_eventbrite_token  # Get from: https://www.eventbrite.com/platform/api-keys/
```

### Step 3: Run Comprehensive Enrichment

```bash
# Enrich all destinations with all APIs
npm run enrich:comprehensive

# Or limit to specific number:
npm run enrich:comprehensive 50  # First 50 destinations

# Or with offset:
npm run enrich:comprehensive 50 100  # 50 destinations starting from offset 100
```

---

## 📊 API Usage Examples

### Get Enriched Destination Data

```typescript
// GET /api/destinations/tate-modern/enriched
const response = await fetch('/api/destinations/tate-modern/enriched');
const data = await response.json();

// Returns:
{
  slug: 'tate-modern',
  photos: [...], // Array of photo objects
  currentWeather: { temperature: 15, weatherCode: 2, ... },
  weatherForecast: [...], // 7-day forecast
  nearbyEvents: [...], // Upcoming events
  routeFromCityCenter: { distanceMeters: 1200, duration: '15 mins', ... },
  staticMapUrl: 'https://maps.googleapis.com/...',
  currencyCode: 'GBP',
  exchangeRateToUSD: 1.27,
  ...
}
```

### Calculate Route

```typescript
// POST /api/routes/calculate
const response = await fetch('/api/routes/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { lat: 51.5074, lng: -0.1278 }, // London center
    destination: { lat: 51.5076, lng: -0.0994 }, // Tate Modern
    mode: 'walking', // or 'driving', 'transit', 'bicycling'
  }),
});
const route = await response.json();
```

### Find Nearby Destinations

```typescript
// GET /api/destinations/nearby?lat=51.5074&lng=-0.1278&radius=5&maxWalkingMinutes=15
const response = await fetch(
  '/api/destinations/nearby?lat=51.5074&lng=-0.1278&radius=5&maxWalkingMinutes=15'
);
const nearby = await response.json();
```

### Get Weather

```typescript
// GET /api/weather?lat=51.5074&lng=-0.1278
const response = await fetch('/api/weather?lat=51.5074&lng=-0.1278');
const weather = await response.json();
```

### Get Nearby Events

```typescript
// GET /api/events/nearby?lat=51.5074&lng=-0.1278&radius=5&limit=10
const response = await fetch(
  '/api/events/nearby?lat=51.5074&lng=-0.1278&radius=5&limit=10'
);
const events = await response.json();
```

---

## 💰 Cost Considerations

| API | Free Tier | Paid Pricing | Notes |
|-----|-----------|--------------|-------|
| **Google Places Photos** | $200/month credit | Pay-as-you-go | Included in Places API |
| **Google Routes API** | $200/month credit | $5 per 1000 requests | New API, pay-per-use |
| **Google Distance Matrix** | $200/month credit | $5 per 1000 elements | Batch calculations |
| **Google Maps Static** | $200/month credit | $2 per 1000 requests | Images cached |
| **Open-Meteo Weather** | ✅ **Completely free** | - | No API key needed! |
| **Eventbrite** | 1000 requests/day | - | Free tier sufficient |
| **ExchangeRate-API** | 1500 requests/month | $9.99/month unlimited | Free tier sufficient |

**Recommendation:** Start with free tiers. Monitor usage in Google Cloud Console.

---

## 🎯 Usage in UI Components

### Display Photos

```tsx
import { useQuery } from '@tanstack/react-query';

function DestinationPhotos({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ['destination-enriched', slug],
    queryFn: () => fetch(`/api/destinations/${slug}/enriched`).then(r => r.json()),
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {data?.photos?.map((photo: any) => (
        <img key={photo.photoReference} src={photo.url} alt={photo.author} />
      ))}
    </div>
  );
}
```

### Show Weather Widget

```tsx
function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const { data } = useQuery({
    queryKey: ['weather', lat, lng],
    queryFn: () => fetch(`/api/weather?lat=${lat}&lng=${lng}`).then(r => r.json()),
  });

  if (!data) return null;

  return (
    <div className="weather-widget">
      <div className="temperature">{data.current.temperature}°C</div>
      <div className="description">{data.current.weatherDescription}</div>
      <div className="forecast">
        {data.forecast.slice(0, 3).map((day: any) => (
          <div key={day.date}>
            {day.date}: {day.temperatureMax}°C / {day.temperatureMin}°C
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Show Nearby Destinations

```tsx
function NearbyDestinations({ lat, lng }: { lat: number; lng: number }) {
  const { data } = useQuery({
    queryKey: ['nearby', lat, lng],
    queryFn: () => fetch(`/api/destinations/nearby?lat=${lat}&lng=${lng}&maxWalkingMinutes=15`).then(r => r.json()),
  });

  return (
    <div>
      <h3>Within 15 min walk</h3>
      {data?.results?.map((dest: any) => (
        <div key={dest.slug}>
          {dest.name} - {dest.walkingTimeMinutes} min walk
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 Refreshing Enrichment Data

### Weather Data
- Refresh daily (weather changes frequently)
- Use cron job or scheduled task

### Events Data
- Refresh daily (events change frequently)
- Use cron job or scheduled task

### Photos
- Refresh weekly (photos don't change often)
- Use cron job or scheduled task

### Routes
- Calculate on-demand (when user requests)
- Cache results for 24 hours

### Static Maps
- Generate once, cache indefinitely
- Only regenerate if coordinates change

### Currency
- Refresh daily (exchange rates change)
- Use cron job or scheduled task

---

## 📝 Next Steps

1. **Run Migration**: Apply `026_add_advanced_enrichment_fields.sql`
2. **Set Environment Variables**: Add `EVENTBRITE_TOKEN` (optional)
3. **Test Enrichment**: Run `npm run enrich:comprehensive 5` to test on 5 destinations
4. **Monitor Costs**: Check Google Cloud Console for API usage
5. **Integrate UI**: Use the API endpoints in your components
6. **Set Up Cron Jobs**: Schedule daily/weekly refreshes for dynamic data

---

## 🐛 Troubleshooting

### Photos Not Loading
- Check `GOOGLE_API_KEY` is set correctly
- Verify Places API is enabled in Google Cloud Console
- Check photo URLs are being generated correctly

### Weather API Errors
- Open-Meteo is free and doesn't require an API key
- Check coordinates are valid (lat/lng)

### Events Not Showing
- `EVENTBRITE_TOKEN` is optional but needed for events
- Check token is valid and has proper permissions
- Events may not be available in all locations

### Routes API Errors
- Verify Routes API is enabled in Google Cloud Console
- Check you're using the new Routes API (not deprecated Directions API)
- Ensure `GOOGLE_API_KEY` has proper permissions

---

## ✅ Status

All components are implemented and ready to use! The enrichment script will fetch all available data and store it in the database. API endpoints are ready to serve the data to your frontend.

**Happy enriching! 🚀**

