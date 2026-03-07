# Rork Prompt for Urban Manual iOS App

## The Prompt

Build a modern, minimalist travel guide iOS app called **"Urban Manual"** — a curated discovery platform for the world's best hotels, restaurants, bars, cafes, and cultural destinations across 50+ cities worldwide. The app should feel like a luxury editorial magazine crossed with a smart travel companion.

### Design System

The design should be **Apple-inspired, monochromatic, and editorial**:

- **Color palette**: Black and white primary. Gray tones for secondary text. No purple anywhere. Accent colors used only for status indicators (green for open, red for closed, yellow for busy, blue for info).
- **Dark mode**: Full dark mode support throughout. Dark backgrounds use near-black (#0a0a0a), dark cards use gray-900.
- **Typography**: Clean, lightweight fonts. Use font-weight 400 for body, 500 for medium emphasis, 600-700 for headings. Small text sizes (12-14px for meta info, 16px for body).
- **Spacing**: Generous whitespace. The app should feel spacious and uncluttered.
- **Cards**: Square aspect-ratio images with rounded corners (16px radius). Title below image, small meta text underneath. No heavy shadows or glass effects.
- **Buttons**: Rounded pill buttons (full radius). Primary = black bg/white text, Secondary = outlined with gray border.
- **Icons**: Use simple line icons (Lucide-style) at 16-20px.

### Screens & Features

#### 1. Home / Browse Screen (Main Tab)
- Hero section at top with the tagline "Discover the World's Best" and an animated/interactive element
- Horizontal scrollable category filter chips: All, Dining, Hotels, Bars, Cafes, Culture, Shopping, Bakery, Parks
- Grid of destination cards (2 columns on phone, 3 on tablet):
  - Square image
  - Destination name (bold, small)
  - City name and category as small gray text below
  - Michelin star badge if applicable (small star icon)
  - Crown icon for featured/premium destinations
- Pull-to-refresh
- Infinite scroll pagination
- Search bar at top that navigates to a dedicated search screen
- Sort options: Trending, Newest, Rating, Distance (if location available)

#### 2. Search Screen
- Full-screen search with large text input, auto-focus on keyboard
- Autocomplete suggestions as user types (destination names, cities, categories)
- Recent searches list
- Trending searches section
- Search results displayed as a list with thumbnail, name, city, category, and rating

#### 3. Destination Detail Screen
- Full-width hero image at top (with parallax scroll effect)
- Back button overlay on image
- Destination name (large heading)
- City, country, neighborhood as subtitle
- Category badge and Michelin stars (if any)
- Rating display (Google rating out of 5, with total reviews count)
- Quick action buttons row: Save (heart), Mark as Visited (check), Share, Add to Trip, Get Directions
- "About" section with editorial description (micro_description for short, description for full)
- "Design Story" section if the destination has architectural significance — show architect/design firm, architectural style, construction year, design story narrative
- Opening hours section (expandable, show today's hours prominently)
- Contact info: phone, website, Instagram handle (tappable links)
- Photo gallery (horizontal scroll of Google Places photos)
- Reviews summary section with AI-generated review summary
- Map preview showing location pin (tappable to open full map)
- "Nearby" section showing other destinations within walking distance
- "Similar Places" section with recommendations
- Nested destinations section (e.g., a hotel that contains a bar or restaurant shows them here)

#### 4. Map Screen (Tab)
- Full-screen interactive map (Apple Maps or Mapbox)
- Destination pins clustered by proximity
- Category-based pin colors/icons
- Tappable pins show a compact card preview (image, name, category, rating)
- Filter panel (slide up from bottom): filter by category, Michelin-starred only, search within map
- List view toggle: switch between map and scrollable list of currently visible destinations
- "Locate me" button to center on user's current location
- Show destinations near the user with distance labels

#### 5. AI Chat / Concierge Screen (Tab)
- Chat interface with message bubbles
- The AI acts as a travel concierge — users can ask things like:
  - "Best restaurants in Tokyo"
  - "Find me a boutique hotel in Paris with great architecture"
  - "What should I do in London for 3 days?"
- AI responses include inline destination cards that are tappable to view details
- Suggested prompts/quick actions when chat is empty:
  - "Plan my trip"
  - "What's trending"
  - "Surprise me"
  - "Best of [city]"
- Streaming responses with typing indicator
- Conversation history preserved per session

#### 6. Trips Screen (Tab)
- List of user's planned trips
- Each trip card shows: trip name, destination city, date range, number of items, cover image
- Create new trip button (+ FAB or header button)
- Trip detail screen:
  - Trip header with city, dates, cover image
  - Day-by-day itinerary view
  - Each day shows morning/afternoon/evening slots
  - Itinerary items show: destination name, time, category icon, notes
  - Stats bar: number of restaurants, hotels, places, flights in the trip
  - Add destination to itinerary (search + pick time slot)
  - Drag to reorder itinerary items
  - Share trip via link
  - AI-powered itinerary generation: "Auto-fill my trip" button that uses AI to suggest an optimal itinerary based on the city and dates

#### 7. Account / Profile Screen (Tab)
- User profile section: avatar, display name, username, bio, member since date
- Travel stats: cities visited, destinations visited, destinations saved, collections created
- Tabs within account:
  - **Profile**: Edit profile info, avatar
  - **Visited**: Grid of destinations the user has marked as visited, with city filters
  - **Saved**: Grid of saved/bookmarked destinations, with city and category filters
  - **Collections**: User-created themed lists (e.g., "Best Coffee in Europe"), each with a name, description, cover image, public/private toggle
  - **Trips**: Quick access to trips (links to Trips tab)
  - **Achievements**: Gamification badges (e.g., "Visited 10 cities", "First Michelin star", "Globe Trotter")
  - **Settings**: Preferences, privacy controls, notification settings, dark mode toggle, cookie/data preferences

#### 8. City Detail Screen (accessed from browsing)
- City hero image
- City name and country
- Stats: number of destinations in this city, categories breakdown
- Category filter chips
- Grid of destinations in this city
- "Best of [City]" editorial section
- Map showing all destinations in this city

#### 9. Lists Screen
- Browse and create curated lists
- Each list has: name, description, cover image, public/private toggle, collaborative toggle
- List detail shows destinations in the list with add/remove capability
- Like/save other users' public lists
- Share lists via link

#### 10. Explore / Discover Screen
- AI-powered "For You" personalized recommendations based on user's visited and saved places
- "Trending" section with currently popular destinations
- "Collections" section showcasing curated editorial collections
- Category breakdown with counts
- Popular cities with destination counts

#### 11. Activity Feed Screen
- Social feed showing activity from people the user follows
- Activity types: visited a place, saved a place, created a collection, completed a trip
- Tabs: "All Activity" and "Following"

### Authentication — Supabase Auth (Detailed)

The app uses **Supabase Auth** for all authentication. You must install `@supabase/supabase-js` (the official JS client works in React Native / Expo).

**Environment variables the app needs (all of them):**
```
# Required — Supabase connection (get from Supabase Dashboard > Project Settings > API)
EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...  (the publishable/anon key — safe to embed in the app)

# Required — Urban Manual API base URL (for AI chat, search, enriched data)
EXPO_PUBLIC_API_BASE_URL=https://www.urbanmanual.co

# Optional — Google Maps (for map screen, if using Google Maps instead of Apple Maps)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Optional — Apple MapKit JS (if using Apple Maps)
# MapKit requires server-side token generation; the web app has a token endpoint
```

**Important:** The mobile app does NOT need OpenAI, Gemini, or any other AI/ML API keys. Those are server-side only — the mobile app accesses AI features by calling the REST API at `EXPO_PUBLIC_API_BASE_URL/api/ai-chat`, which already has all the keys configured on the backend (Vercel).

**What each variable powers:**
| Variable | Used for |
|----------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | All direct database queries (destinations, saved places, visited, trips, collections, user profiles), authentication (sign-in, sign-up, session management) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as above — this is the public/anonymous key that respects Row Level Security |
| `EXPO_PUBLIC_API_BASE_URL` | AI chat (`/api/ai-chat`), intelligent search (`/api/search`), instant search (`/api/search/instant`), enriched destination data (`/api/destinations/[slug]/enriched`), nearby destinations (`/api/destinations/nearby`) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Map markers, geocoding, Places photos |

**Initialize the Supabase client (once, in a shared `lib/supabase.ts` module):**
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,          // Persist sessions across app launches
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,      // Disable for React Native
  },
});
```

**Create an API helper for REST endpoints (in `lib/api.ts`):**
```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!; // https://www.urbanmanual.co

export async function apiFetch(path: string, options?: RequestInit & { token?: string }) {
  const { token, ...fetchOptions } = options || {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Usage examples:
// apiFetch('/api/ai-chat', { method: 'POST', body: JSON.stringify({ query: '...' }) })
// apiFetch('/api/search/instant?q=aman')
// apiFetch('/api/trips', { token: session.access_token })
```

**Sign in with Apple (required for App Store):**
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

// Pass the Apple ID token to Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: credential.identityToken!,
});
```

**Sign in with Google:**
```typescript
import * as Google from 'expo-auth-session/providers/google';

// After getting the Google ID token:
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: googleIdToken,
});
```

**Email/password:**
```typescript
// Sign up
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: name } },
});

// Sign in
await supabase.auth.signInWithPassword({ email, password });
```

**Session management — create an AuthContext provider:**
```typescript
// On app mount, restore session:
const { data: { session } } = await supabase.auth.getSession();
setUser(session?.user ?? null);

// Listen for changes (login, logout, token refresh):
supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null);
});

// Sign out:
await supabase.auth.signOut();
```

**Important:** The app should work in **browse-only mode** without authentication. Saving, marking visited, trips, chat, and social features require login. Show a sign-in prompt when an unauthenticated user taps these actions.

**Getting the current user's ID (needed for all user-specific queries):**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id; // UUID string
```

---

### Data & Backend — Supabase Direct + REST API

The app has **two ways** to access data:

1. **Supabase client** (direct database queries with RLS) — best for CRUD on user-specific tables
2. **REST API** at `https://www.urbanmanual.co/api/*` — best for search, AI chat, and enriched data

Use the Supabase client for: browsing destinations, save/unsave, mark visited, trips CRUD, collections, user profile.
Use the REST API for: AI chat, intelligent search, enriched destination data, nearby destinations.

---

### Database Schema & Supabase Queries

#### Core Table: `destinations` (~900 rows)

```typescript
// Key columns for the mobile app:
interface Destination {
  id: number;                        // Primary key
  slug: string;                      // URL-friendly ID (e.g., "aman-tokyo")
  name: string;                      // "Aman Tokyo"
  city: string;                      // "Tokyo"
  country: string | null;            // "Japan"
  neighborhood: string | null;       // "Otemachi"
  category: string;                  // "Dining" | "Hotel" | "Bar" | "Cafe" | "Culture" | "Shopping" | "Bakery" | "Park" | "Other"
  micro_description: string | null;  // 1-line card description
  description: string | null;        // Full editorial description
  image: string | null;              // Primary image URL
  image_thumbnail: string | null;    // Optimized thumbnail
  michelin_stars: number | null;     // 0-3
  crown: boolean | null;             // Featured/premium flag
  rating: number | null;             // Google rating (1.0-5.0)
  price_level: number | null;        // 1-4 ($ to $$$$)
  latitude: number | null;
  longitude: number | null;
  phone_number: string | null;
  website: string | null;
  google_maps_url: string | null;
  instagram_handle: string | null;
  tags: string[] | null;             // e.g., ["romantic", "rooftop", "view"]
  opening_hours_json: object | null; // Parsed Google opening hours
  photos_json: object[] | null;      // Array of Google Places photo refs
  reviews_json: object[] | null;     // Google reviews
  formatted_address: string | null;
  user_ratings_total: number | null; // Total Google review count
  editorial_summary: string | null;  // Google editorial summary
  design_firm: string | null;        // Architecture/design firm name
  architectural_style: string | null;
  design_story: string | null;       // Rich narrative about the design
  construction_year: number | null;
  parent_destination_id: number | null; // If nested under another destination
  views_count: number;
  saves_count: number;
  visits_count: number;
  opentable_url: string | null;
  resy_url: string | null;
  booking_url: string | null;
}
```

**Fetch destinations for the home grid (paginated):**
```typescript
const PAGE_SIZE = 30;

const { data, error } = await supabase
  .from('destinations')
  .select('id, slug, name, city, country, category, image, image_thumbnail, michelin_stars, crown, rating, price_level, micro_description')
  .is('parent_destination_id', null)   // Exclude nested destinations
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

**Filter by category:**
```typescript
const { data } = await supabase
  .from('destinations')
  .select('id, slug, name, city, country, category, image, image_thumbnail, michelin_stars, crown, rating, price_level, micro_description')
  .is('parent_destination_id', null)
  .eq('category', 'Dining')   // or 'Hotel', 'Bar', 'Cafe', etc.
  .order('rating', { ascending: false })
  .range(0, 29);
```

**Filter by city:**
```typescript
const { data } = await supabase
  .from('destinations')
  .select('*')
  .is('parent_destination_id', null)
  .eq('city', 'Tokyo')
  .order('rating', { ascending: false });
```

**Get single destination detail by slug:**
```typescript
const { data: destination } = await supabase
  .from('destinations')
  .select('*')
  .eq('slug', 'aman-tokyo')
  .single();

// Also fetch nested destinations (e.g., restaurants inside a hotel):
const { data: nested } = await supabase
  .from('destinations')
  .select('id, slug, name, category, image, rating, michelin_stars, micro_description')
  .eq('parent_destination_id', destination.id);
```

**Get distinct cities (for city list/filter):**
```typescript
const { data } = await supabase
  .from('destinations')
  .select('city, country')
  .is('parent_destination_id', null);
// Deduplicate client-side to get unique cities with counts
```

---

#### User Table: `saved_places`

```typescript
// Columns: id, user_id, destination_slug, notes, created_at
```

**Check if a destination is saved:**
```typescript
const { data } = await supabase
  .from('saved_places')
  .select('id')
  .eq('user_id', userId)
  .eq('destination_slug', slug)
  .maybeSingle();
const isSaved = !!data;
```

**Toggle save (optimistic UI — update UI first, revert on error):**
```typescript
// Save
await supabase
  .from('saved_places')
  .upsert({ user_id: userId, destination_slug: slug });

// Unsave
await supabase
  .from('saved_places')
  .delete()
  .eq('user_id', userId)
  .eq('destination_slug', slug);
```

**Get all saved destinations for current user:**
```typescript
const { data: savedSlugs } = await supabase
  .from('saved_places')
  .select('destination_slug')
  .eq('user_id', userId);

// Then fetch full destination data:
const { data: destinations } = await supabase
  .from('destinations')
  .select('id, slug, name, city, category, image, image_thumbnail, rating, michelin_stars')
  .in('slug', savedSlugs.map(s => s.destination_slug));
```

---

#### User Table: `visited_places`

```typescript
// Columns: id, user_id, destination_slug, rating, notes, visited_at, created_at
```

**Toggle visited:**
```typescript
// Mark as visited
await supabase
  .from('visited_places')
  .upsert({
    user_id: userId,
    destination_slug: slug,
    visited_at: new Date().toISOString(),
  });

// Unmark
await supabase
  .from('visited_places')
  .delete()
  .eq('user_id', userId)
  .eq('destination_slug', slug);
```

---

#### User Table: `user_profiles`

```typescript
// Columns: user_id, display_name, username, bio, location, website_url,
//          avatar_url, birthday, is_public, favorite_cities, favorite_categories,
//          travel_style, interests, follower_count, following_count, created_at, updated_at
```

**Get profile:**
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Update profile:**
```typescript
await supabase
  .from('user_profiles')
  .upsert({
    user_id: userId,
    display_name: 'New Name',
    bio: 'Travel lover',
    updated_at: new Date().toISOString(),
  });
```

---

#### Trips Table: `trips`

```typescript
// Columns: id (UUID), user_id, title, description, destination (city name or JSON array),
//          start_date, end_date, status ('planning'|'upcoming'|'ongoing'|'completed'),
//          is_public, cover_image, notes (JSON), share_token, packing_list (JSON),
//          created_at, updated_at
```

**List user's trips:**
```typescript
const { data: trips } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', userId)
  .order('start_date', { ascending: false });
```

**Create a trip:**
```typescript
const { data: trip } = await supabase
  .from('trips')
  .insert({
    user_id: userId,
    title: 'Tokyo Weekend',
    destination: JSON.stringify(['Tokyo']),  // Supports multi-city as JSON array
    start_date: '2026-03-01',
    end_date: '2026-03-03',
    status: 'planning',
  })
  .select()
  .single();
```

#### Itinerary Items Table: `itinerary_items`

```typescript
// Columns: id (UUID), trip_id, destination_slug, day (integer), order_index (integer),
//          time (string e.g. "09:00"), title, description, notes (JSON — see below), created_at
```

**The `notes` column stores a JSON object with rich metadata:**
```typescript
interface ItineraryItemNotes {
  type?: 'place' | 'flight' | 'hotel' | 'train' | 'event' | 'activity' | 'custom';
  duration?: number;           // minutes
  image?: string;
  city?: string;
  category?: string;
  slug?: string;               // link to destination
  latitude?: number;
  longitude?: number;
  // Flight-specific:
  from?: string; to?: string; airline?: string; flightNumber?: string;
  departureTime?: string; arrivalTime?: string; confirmationNumber?: string;
  // Hotel-specific:
  isHotel?: boolean; checkInTime?: string; checkOutTime?: string;
  breakfastIncluded?: boolean; confirmation?: string; roomType?: string;
  // Booking:
  bookingStatus?: 'need-to-book' | 'booked' | 'waitlist' | 'walk-in';
  costEstimate?: number; currency?: string;
  priority?: 'must-do' | 'want-to' | 'if-time';
}
```

**Get itinerary for a trip:**
```typescript
const { data: items } = await supabase
  .from('itinerary_items')
  .select('*')
  .eq('trip_id', tripId)
  .order('day', { ascending: true })
  .order('order_index', { ascending: true });
```

**Add item to itinerary:**
```typescript
await supabase
  .from('itinerary_items')
  .insert({
    trip_id: tripId,
    destination_slug: 'tsukiji-outer-market-tokyo',
    day: 1,
    order_index: 0,
    time: '10:00',
    title: 'Sushi breakfast at Tsukiji',
    notes: JSON.stringify({ type: 'place', duration: 90, category: 'Dining' }),
  });
```

---

#### Collections Table: `collections`

```typescript
// Columns: id, user_id, name, description, emoji, color, is_public,
//          destination_count, view_count, created_at, updated_at
```

**Create collection:**
```typescript
await supabase
  .from('collections')
  .insert({
    user_id: userId,
    name: 'Best Coffee in Europe',
    description: 'My favorite cafes across the continent',
    emoji: '☕',
    is_public: false,
  });
```

---

#### Social Table: `user_follows`

```typescript
// Columns: id, follower_id, following_id, created_at
```

---

### REST API Endpoints (for features that need server-side logic)

Base URL: `process.env.EXPO_PUBLIC_API_BASE_URL` (i.e., `https://www.urbanmanual.co`)

Use the `apiFetch` helper from `lib/api.ts` (defined above in the Authentication section). For endpoints that require authentication, pass the Supabase access token:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Authenticated request example:
const data = await apiFetch('/api/trips', { token });

// Unauthenticated request example:
const results = await apiFetch('/api/search/instant?q=aman');
```

#### AI Chat — `POST /api/ai-chat`

The most important API endpoint. Sends a natural-language query and gets back a response with matching destinations.

```typescript
// Request:
{
  query: "best restaurants in Tokyo",
  userId: "user-uuid",                    // optional, for personalization
  conversationHistory: [                  // optional, for multi-turn context
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ],
  stream: false                           // set true for SSE streaming
}

// Response (stream=false):
{
  content: "Here are some incredible restaurants in Tokyo...",  // Natural language
  destinations: [                          // Array of matching destinations (0-20)
    {
      id: 42,
      name: "Sushi Saito",
      slug: "sushi-saito-tokyo",
      city: "Tokyo",
      category: "Dining",
      rating: 4.8,
      price_level: 4,
      michelin_stars: 3,
      image: "https://...",
      micro_description: "..."
    }
  ],
  intent: {                               // Parsed intent from the query
    keywords: ["restaurants"],
    city: "Tokyo",
    category: "Dining"
  },
  suggestions: [                          // Follow-up prompt suggestions
    { text: "Show me budget-friendly options", type: "refine" },
    { text: "What about ramen shops?", type: "related" }
  ],
  tripPlanning: null                      // Non-null when trip intent detected
}
```

**For streaming (SSE):** Set `stream: true`. Events arrive as Server-Sent Events:
- `status` — processing stage
- `intent` — parsed intent object
- `destinations` — matching destinations array
- `chunk` — partial response text
- `complete` — final combined response

#### Intelligent Search — `POST /api/search`

```typescript
// Request:
{
  query: "quiet cafes with wifi",
  filters: { city: "Paris", category: "Cafe" },   // optional
  userId: "user-uuid"                               // optional
}

// Response:
{
  results: [ /* array of destination objects, max 10 */ ],
  searchTier: "vector-semantic",  // or "fulltext", "keyword"
  intent: { keywords: [...], city: "Paris", category: "Cafe" },
  suggestions: [...]
}
```

#### Instant Search (typeahead) — `GET /api/search/instant?q=aman`

```typescript
// Response:
{
  results: [
    { type: "destination", name: "Aman Tokyo", slug: "aman-tokyo", city: "Tokyo", category: "Hotel", image: "..." },
    { type: "saved", name: "Aman Venice", slug: "aman-venice", ... },
    { type: "trip", name: "Tokyo Trip", tripId: "uuid", ... }
  ],
  meta: { query: "aman", hasMore: true }
}
```

#### Enriched Destination — `GET /api/destinations/[slug]/enriched`

Returns a single destination with all enriched data (weather, events, walking routes, photos).

```typescript
// Response: Full Destination object with parsed JSON fields:
{
  ...allDestinationFields,
  photos: [...],                  // Parsed from photos_json
  currentWeather: {...},          // Parsed from current_weather_json
  nearbyEvents: [...],            // Parsed from nearby_events_json
  routeFromCityCenter: {...},     // Walking route data
  walkingTimeFromCenter: 12       // Minutes
}
```

#### Nearby Destinations — `GET /api/destinations/nearby?lat=35.68&lng=139.77&radius=5`

```typescript
// Response:
{
  origin: { lat: 35.68, lng: 139.77 },
  radiusKm: 5,
  results: [ /* destinations sorted by distance */ ],
  count: 15
}
```

#### Trips CRUD — `/api/trips` and `/api/trips/[id]`

These mirror the Supabase direct queries but add server-side validation. You can use either approach — Supabase direct is simpler for the mobile app.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/trips` | List user's trips (requires auth) |
| POST | `/api/trips` | Create trip |
| GET | `/api/trips/[id]` | Get trip with enriched itinerary items |
| PATCH | `/api/trips/[id]` | Update trip fields |
| DELETE | `/api/trips/[id]` | Delete trip |
| POST | `/api/trips/[id]/items` | Add itinerary item |
| PATCH | `/api/trips/[id]/items` | Update itinerary item |
| DELETE | `/api/trips/[id]/items?itemId=uuid` | Remove itinerary item |

#### User Profile — `/api/account/profile`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/account/profile` | Get authenticated user's profile |
| PUT | `/api/account/profile` | Update profile (display_name, bio, username, location, website_url, birthday, is_public) |

#### Public User — `GET /api/users/[user_id]`

Returns a public user profile with stats (saved count, visited count, collections count).

#### Collections — `/api/collections`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/collections` | List user's collections |
| POST | `/api/collections` | Create collection: `{ name, description?, emoji?, color?, is_public? }` |
| GET | `/api/collections/discover?q=coffee&sort=popular&limit=20` | Browse public collections |

---

### Row Level Security (RLS)

Supabase RLS is enabled. The anon key + user session automatically enforces:
- **destinations**: Public read for everyone (no auth needed)
- **saved_places**: Users can only read/write their own rows
- **visited_places**: Users can only read/write their own rows
- **trips**: Users can only read/write their own trips (public trips readable by all)
- **itinerary_items**: Accessible if user owns the parent trip
- **collections**: Own collections always accessible; public collections readable by all
- **user_profiles**: Own profile writable; public profiles readable by all

This means authenticated Supabase queries automatically filter to the current user's data — no manual `user_id` filtering needed for most operations (the RLS policy handles it). But you should still include `.eq('user_id', userId)` for clarity and as a safety net.

### Key Interactions & Polish
- Haptic feedback on save, visit mark, and important actions
- Smooth transitions between screens (shared element transitions for destination cards to detail)
- Pull-to-refresh on all list screens
- Skeleton loading states (pulsing gray rectangles matching content layout)
- Empty states with helpful illustrations and CTAs
- Offline support: cache recently viewed destinations for offline access
- Deep linking: urbanmanual.co/destination/[slug] should open the corresponding screen in the app
- Push notifications for: trip reminders, new recommendations, social activity

### Tab Bar Structure
5 tabs at the bottom:
1. **Home** (grid icon) — Browse destinations
2. **Map** (map pin icon) — Interactive map view
3. **Chat** (message icon) — AI concierge
4. **Trips** (briefcase/plane icon) — Trip planning
5. **Account** (person icon) — Profile & settings
