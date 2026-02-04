# Additional API Enrichment Opportunities

## Current Status
✅ **Already Integrated:**
- Google Places API (New) - Basic place data, reviews, hours, ratings
- OpenAI API - Embeddings (`text-embedding-3-large`), GPT models for content generation
- Google Generative AI (Gemini) - Fallback LLM
- Google Time Zone API - Timezone detection
- Asimov.mov - Semantic search fallback

---

## 🎯 High-Value Additions

### 1. **Google Places API (New) - Advanced Fields**

**What we're missing:**
- **Photos** - High-quality place photos (requires separate photo URLs)
- **Menu URLs** - Restaurant menu links
- **Place amenities** - Full list of amenities (beyond what we fetch)
- **Secondary opening hours** - Delivery/pickup hours
- **Live updates** - Real-time busy-ness data

**Implementation:**
```typescript
// Add to fetch-all-place-data.ts
const PHOTO_FIELDS = ['photos'];

// Photo URLs require separate API call:
// GET https://places.googleapis.com/v1/{placeId}/photos/{photoReference}
// Use maxWidthPx=1200 for optimal quality
```

**Value:** Rich visual content, better UX

---

### 2. **Google Routes API / Directions API**

**What it provides:**
- Walking/driving directions between destinations
- Transit routes (public transport)
- Multi-waypoint optimization
- Real-time traffic data
- Estimated travel times

**Use Cases:**
- "Plan my day" itinerary builder
- "Walking tour" generator
- "Nearby" suggestions with actual walking times
- Route optimization for multi-destination trips

**Implementation:**
```typescript
// app/api/routes/route.ts
import { Client } from '@googlemaps/google-maps-services-js';

async function getRoute(origin: string, destination: string, waypoints?: string[]) {
  const client = new Client({});
  const response = await client.directions({
    params: {
      origin,
      destination,
      waypoints,
      mode: 'walking', // or 'driving', 'transit', 'bicycling'
      key: GOOGLE_API_KEY,
    },
  });
  return response.data;
}
```

**Value:** Core feature for travel intelligence platform

---

### 3. **Google Distance Matrix API**

**What it provides:**
- Distance and travel time between multiple origins/destinations
- Batch distance calculations
- Multiple travel modes (walking, driving, transit)

**Use Cases:**
- "Show me restaurants within 10 min walk"
- "What's closest to my hotel?"
- Batch proximity calculations for search ranking

**Implementation:**
```typescript
// lib/routes/distance-matrix.ts
async function getDistances(
  origins: string[],
  destinations: string[],
  mode: 'walking' | 'driving' | 'transit' = 'walking'
) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${origins.join('|')}&` +
    `destinations=${destinations.join('|')}&` +
    `mode=${mode}&` +
    `key=${GOOGLE_API_KEY}`
  );
  return response.json();
}
```

**Value:** Essential for location-aware search and recommendations

---

### 4. **Google Maps Static API**

**What it provides:**
- Static map images (no JavaScript required)
- Custom markers and styling
- Street view static images

**Use Cases:**
- Server-side map previews
- Email marketing with map images
- SEO-friendly map images
- Street view previews on destination cards

**Implementation:**
```typescript
// lib/maps/static.ts
function getStaticMapUrl(
  center: { lat: number; lng: number },
  markers?: Array<{ lat: number; lng: number; label?: string }>,
  zoom: number = 15
): string {
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const params = new URLSearchParams({
    center: `${center.lat},${center.lng}`,
    zoom: zoom.toString(),
    size: '800x400',
    maptype: 'roadmap',
    key: GOOGLE_API_KEY!,
  });
  
  if (markers) {
    markers.forEach(m => {
      params.append('markers', `${m.lat},${m.lng}${m.label ? `|label:${m.label}` : ''}`);
    });
  }
  
  return `${baseUrl}?${params.toString()}`;
}
```

**Value:** Performance (no client-side JS), SEO, email compatibility

---

### 5. **Google Geocoding API**

**What it provides:**
- Address → coordinates (forward geocoding)
- Coordinates → address (reverse geocoding)
- Address component parsing (street, city, postal code, etc.)

**Use Cases:**
- Validate and normalize addresses during onboarding
- Reverse geocode user location for "near me" features
- Extract neighborhood/district from coordinates

**Implementation:**
```typescript
// lib/geocoding.ts
async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(address)}&` +
    `key=${GOOGLE_API_KEY}`
  );
  const data = await response.json();
  return data.results[0];
}

async function reverseGeocode(lat: number, lng: number) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `latlng=${lat},${lng}&` +
    `key=${GOOGLE_API_KEY}`
  );
  return response.json();
}
```

**Value:** Data quality, location accuracy

---

### 6. **OpenAI Vision API (GPT-4o with Vision)**

**What it provides:**
- Image analysis and description
- Extract text from images (menus, signs)
- Identify features in photos

**Use Cases:**
- Auto-generate image captions from Google Places photos
- Extract menu text from restaurant photos
- Analyze interior/exterior photos for style detection
- Generate alt text for accessibility

**Implementation:**
```typescript
// lib/vision/analyze-image.ts
import OpenAI from 'openai';

async function analyzePlaceImage(imageUrl: string, prompt: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // or 'gpt-4o-mini' for cost efficiency
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: 300,
  });
  
  return response.choices[0].message.content;
}
```

**Value:** Rich content generation, accessibility, SEO

---

### 7. **OpenAI Audio API (Whisper)**

**What it provides:**
- Speech-to-text transcription
- Multi-language support
- Audio translation

**Use Cases:**
- Transcribe audio reviews/videos
- Generate transcripts for user-generated content
- Multi-language review support

**Implementation:**
```typescript
// lib/audio/transcribe.ts
import OpenAI from 'openai';

async function transcribeAudio(audioUrl: string, language?: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const audioFile = await fetch(audioUrl).then(r => r.blob());
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language, // e.g., 'en', 'ja', 'fr'
    response_format: 'json',
  });
  
  return transcription.text;
}
```

**Value:** Content accessibility, multi-language support

---

### 8. **Weather APIs**

**Options:**
- **Open-Meteo** (Free, no API key needed)
- **OpenWeatherMap** (Free tier available)
- **WeatherAPI** (Free tier: 1M calls/month)

**What it provides:**
- Current weather conditions
- Forecast (hourly/daily)
- Historical weather data
- Air quality indexes

**Use Cases:**
- "Best time to visit" recommendations
- Weather-aware itinerary suggestions
- Seasonal activity recommendations
- Real-time weather widgets on destination pages

**Implementation:**
```typescript
// lib/weather/open-meteo.ts
async function getWeather(lat: number, lng: number) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lng}&` +
    `hourly=temperature_2m,precipitation_probability,weather_code&` +
    `daily=weather_code,temperature_2m_max,temperature_2m_min&` +
    `timezone=auto`
  );
  return response.json();
}
```

**Value:** Contextual intelligence, better recommendations

---

### 9. **Event APIs**

**Options:**
- **Eventbrite API** (Free tier: 1000 requests/day)
- **Ticketmaster Discovery API** (Free tier available)
- **Amadeus Events API** (Travel-specific)
- **Google Calendar API** (Public events)

**What it provides:**
- Nearby events (concerts, exhibitions, festivals)
- Event dates and times
- Event categories and descriptions
- Ticket availability

**Use Cases:**
- "What's happening this weekend?" feature
- Contextual event recommendations
- Seasonal event highlights
- "While you're in [city]" suggestions

**Implementation:**
```typescript
// lib/events/eventbrite.ts
async function getNearbyEvents(lat: number, lng: number, radius: number = 5) {
  const response = await fetch(
    `https://www.eventbriteapi.com/v3/events/search/?` +
    `location.latitude=${lat}&` +
    `location.longitude=${lng}&` +
    `location.within=${radius}km&` +
    `expand=venue&` +
    `token=${EVENTBRITE_TOKEN}`
  );
  return response.json();
}
```

**Value:** Real-time context, engagement boost

---

### 10. **Instagram Basic Display API**

**What it provides:**
- Public Instagram posts/media for a location
- Hashtag search
- User media (with permission)

**Use Cases:**
- Auto-curate Instagram photos for destinations
- Social proof (show real visitor photos)
- Recent activity indicators
- Visual content enrichment

**Note:** Requires OAuth flow, rate limits apply

**Implementation:**
```typescript
// lib/social/instagram.ts
async function getLocationMedia(locationId: string) {
  // Requires OAuth token
  const response = await fetch(
    `https://graph.instagram.com/v18.0/${locationId}/media?` +
    `fields=media_type,media_url,permalink,timestamp,caption&` +
    `access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  return response.json();
}
```

**Value:** Visual content, social proof, engagement

---

### 11. **Currency Exchange APIs**

**Options:**
- **ExchangeRate-API** (Free tier: 1500 requests/month)
- **Fixer.io** (Free tier: 100 requests/month)
- **CurrencyLayer** (Free tier available)

**What it provides:**
- Real-time exchange rates
- Historical rates
- Currency conversion

**Use Cases:**
- Display prices in user's local currency
- Multi-currency price comparisons
- Budget estimation tools

**Implementation:**
```typescript
// lib/currency/exchange-rate.ts
async function getExchangeRate(from: string, to: string) {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${from}`
  );
  const data = await response.json();
  return data.rates[to];
}

async function convertPrice(amount: number, fromCurrency: string, toCurrency: string) {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}
```

**Value:** Better UX for international users

---

### 12. **Translation APIs**

**Options:**
- **Google Cloud Translation API**
- **DeepL API** (Better quality, paid)
- **LibreTranslate** (Free, self-hosted)

**What it provides:**
- Text translation between languages
- Language detection
- Batch translation

**Use Cases:**
- Multi-language destination descriptions
- Translate user reviews
- Localized content for international users

**Implementation:**
```typescript
// lib/translation/google.ts
async function translateText(text: string, targetLanguage: string) {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?` +
    `q=${encodeURIComponent(text)}&` +
    `target=${targetLanguage}&` +
    `key=${GOOGLE_API_KEY}`
  );
  const data = await response.json();
  return data.data.translations[0].translatedText;
}
```

**Value:** Global reach, accessibility

---

## 🎯 Priority Ranking

### Phase 1: Core Intelligence (Implement First)
1. **Google Routes API** - Essential for itinerary planning
2. **Google Distance Matrix API** - Critical for "nearby" features
3. **Google Maps Static API** - Performance & SEO benefits
4. **Weather API** - Contextual intelligence

### Phase 2: Content Enrichment
5. **Google Places Photos API** - Visual content
6. **OpenAI Vision API** - Image analysis & captions
7. **Event APIs** - Real-time context

### Phase 3: Advanced Features
8. **Instagram API** - Social proof
9. **Currency APIs** - International UX
10. **Translation APIs** - Global reach

---

## 📊 Cost Considerations

| API | Free Tier | Paid Pricing |
|-----|-----------|--------------|
| **Google Routes API** | $200/month credit | $5 per 1000 requests |
| **Google Distance Matrix** | $200/month credit | $5 per 1000 elements |
| **Google Maps Static** | $200/month credit | $2 per 1000 requests |
| **OpenAI Vision** | Pay-as-you-go | $0.01-0.03 per image |
| **Open-Meteo** | ✅ Completely free | - |
| **Eventbrite** | 1000 requests/day | - |
| **ExchangeRate-API** | 1500 requests/month | $9.99/month unlimited |

**Recommendation:** Start with free tiers, monitor usage, upgrade as needed.

---

## 🚀 Quick Wins (Easiest to Implement)

1. **Open-Meteo Weather** - No API key, simple REST API
2. **Google Maps Static API** - Already have Google API key
3. **ExchangeRate-API** - Simple REST, no auth needed
4. **Google Places Photos** - Extend existing Places API integration

---

## 📝 Next Steps

1. **Create enrichment scripts** for high-priority APIs
2. **Add database columns** for new data fields
3. **Update UI components** to display new data
4. **Set up monitoring** for API usage and costs
5. **Implement caching** to reduce API calls

---

## Example: Combined Enrichment Script

```typescript
// scripts/enrich-destination-complete.ts
async function enrichDestinationComplete(slug: string) {
  const dest = await getDestination(slug);
  
  // 1. Google Places (already done)
  const placeData = await fetchGooglePlaceData(dest);
  
  // 2. Weather
  const weather = await getWeather(dest.latitude, dest.longitude);
  
  // 3. Nearby events
  const events = await getNearbyEvents(dest.latitude, dest.longitude);
  
  // 4. Routes from city center
  const cityCenter = await getCityCenter(dest.city);
  const route = await getRoute(cityCenter, `${dest.latitude},${dest.longitude}`);
  
  // 5. Static map image
  const mapImageUrl = getStaticMapUrl(
    { lat: dest.latitude, lng: dest.longitude },
    [{ lat: dest.latitude, lng: dest.longitude }]
  );
  
  // 6. Exchange rate (if price_level exists)
  const exchangeRate = dest.price_level 
    ? await getExchangeRate('USD', 'EUR') // User's currency
    : null;
  
  // Update database
  await updateDestination(slug, {
    ...placeData,
    weather_json: JSON.stringify(weather),
    nearby_events_json: JSON.stringify(events),
    route_from_city_center_json: JSON.stringify(route),
    static_map_url: mapImageUrl,
    exchange_rate_to_usd: exchangeRate,
  });
}
```

---

This comprehensive enrichment would transform Urban Manual from a static directory into a **true travel intelligence platform** with real-time context, visual content, and actionable insights.

