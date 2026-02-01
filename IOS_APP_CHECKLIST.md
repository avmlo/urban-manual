# Urban Manual iOS App — Build Checklist

Reference: All API endpoints live at `urbanmanual.co/api/...` (215+ endpoints). The iOS app is a native client consuming this existing backend.

---

## Phase 1: Project Setup & Architecture

- [ ] Initialize Xcode project (SwiftUI, iOS 17+, Swift 6)
- [ ] Set up folder structure: `Models/`, `Views/`, `ViewModels/`, `Services/`, `Core/`, `Extensions/`, `Resources/`
- [ ] Configure Swift Package Manager dependencies:
  - Networking (Alamofire or URLSession wrapper)
  - Image loading (Kingfisher or Nuke)
  - Keychain access (KeychainAccess)
  - Supabase Swift SDK (`supabase-swift`)
  - MapKit (built-in)
  - Sentry iOS SDK
- [ ] Set up environment configuration (dev/staging/prod base URLs)
- [ ] Create `APIClient` service with base URL `https://www.urbanmanual.co/api`
- [ ] Add standard request headers, auth token injection, error handling
- [ ] Set up response models matching backend patterns (`{ data, count }` / `{ error: { code, message } }`)
- [ ] Configure rate-limit retry logic (respect `retryAfter` from 429 responses)

---

## Phase 2: Authentication

- [ ] Implement Sign in with Apple (native `AuthenticationServices`)
- [ ] Implement Sign in with Google (`GoogleSignIn-iOS` SDK)
- [ ] Integrate Supabase Auth Swift SDK for session management
- [ ] Store tokens securely in Keychain (not UserDefaults)
- [ ] Handle token refresh flow via Supabase `onAuthStateChange`
- [ ] Build sign-in screen (Apple + Google buttons, skip/guest option)
- [ ] Handle OAuth callback deep links
- [ ] Add sign-out flow (clear Keychain, reset state)
- [ ] Handle expired/invalid session gracefully (redirect to login)

---

## Phase 3: Core Data Models

Define Swift structs (Codable) matching the backend types:

- [ ] `Destination` — slug, name, city, country, neighborhood, category, description, micro_description, image, latitude, longitude, michelin_stars, rating, brand, architect_id, opening_hours, photos, reviews, booking URLs (opentable, resy, booking), saves_count, visits_count
- [ ] `Trip` — id, userId, title, emoji, destinations (multi-city), startDate, endDate, travelerCount, visibility, shareSlug, status
- [ ] `ItineraryItem` — id, tripId, day, orderIndex, time, category (flight/hotel/restaurant/etc), title, address, lat/lng, destinationSlug, bookingStatus, confirmationNumber, costEstimate, travelTimeToNext, priority
- [ ] `Collection` — id, user_id, name, description, emoji, color, is_public, destinations, destination_count
- [ ] `UserProfile` — user_id, display_name, bio, location, website_url, username, is_public, follower_count, following_count, avatar_url
- [ ] `SavedPlace` — user_id, destination_slug, saved_at, notes
- [ ] `VisitedPlace` — user_id, destination_slug, visited_at, rating, notes
- [ ] `SearchResult` — wrapper for semantic/hybrid search responses
- [ ] `ChatMessage` — role, content, timestamp, metadata

---

## Phase 4: Core Screens

### 4a. Home / Discovery
- [ ] Home feed consuming `GET /api/homepage/destinations`
- [ ] Category filters (restaurant, hotel, bar, cafe, culture, shopping, park)
- [ ] City selector using `GET /api/homepage/filters`
- [ ] Pull-to-refresh
- [ ] Destination card component (image, name, city, category, micro_description, rating)
- [ ] Personalized recommendations via `GET /api/recommendations/hybrid`
- [ ] Trending/discovery section via `GET /api/recommendations/discovery`

### 4b. Search
- [ ] Search bar with autocomplete via `GET /api/search/autocomplete`
- [ ] Hybrid search results via `GET /api/search/hybrid`
- [ ] Semantic search via `POST /api/search/semantic`
- [ ] Filter by city, category, rating
- [ ] Recent searches (local storage)
- [ ] Empty state and no-results handling

### 4c. Destination Detail
- [ ] Fetch enriched data via `GET /api/destinations/[slug]/enriched`
- [ ] Image gallery (photos from Google Places)
- [ ] Description, rating, Michelin stars badge
- [ ] Opening hours display
- [ ] Map preview with pin (MapKit)
- [ ] "Get Directions" button (open in Apple Maps)
- [ ] Nearby destinations via `GET /api/destinations/nearby?lat=&lng=&radius=`
- [ ] Save/unsave toggle
- [ ] Mark as visited toggle
- [ ] Add to collection action
- [ ] Add to trip action
- [ ] Booking links (OpenTable, Resy, external)
- [ ] Report issue via `POST /api/destinations/report-issue`
- [ ] Share sheet (deep link URL)

### 4d. Map View
- [ ] Full-screen MapKit view with destination pins
- [ ] Cluster annotations for dense areas
- [ ] Fetch Apple MapKit token via `GET /api/mapkit-token`
- [ ] Filter pins by category
- [ ] Tap pin to show destination card overlay
- [ ] "Near me" using device location
- [ ] Route display between itinerary stops

### 4e. Trip Planning
- [ ] Trip list view via `GET /api/trips`
- [ ] Create trip via `POST /api/trips` (title, destinations, dates, traveler count)
- [ ] Trip detail view via `GET /api/trips/[id]`
- [ ] Day-by-day itinerary view with `GET /api/trips/[id]/items`
- [ ] Add/remove/reorder itinerary items (drag & drop)
- [ ] Batch operations via `POST /api/trips/[id]/items/batch`
- [ ] AI itinerary generation via intelligence endpoints
- [ ] Booking status indicators per item
- [ ] Cost estimate summary
- [ ] Travel time between stops
- [ ] Share trip (public/shared/private visibility)
- [ ] Delete trip via `DELETE /api/trips/[id]`

### 4f. AI Chat
- [ ] Chat interface with streaming responses from `POST /api/ai-chat`
- [ ] Conversation history persistence
- [ ] Quick prompts ("Plan a weekend in Tokyo", "Best restaurants in Paris")
- [ ] Inline destination cards when AI references places
- [ ] Chat modes: general, itinerary-focused, similar items
- [ ] Loading/typing indicators during streaming

### 4g. Collections / Lists
- [ ] Collections list via `GET /api/collections`
- [ ] Create collection (name, emoji, color, description, public/private)
- [ ] Collection detail — grid of destinations
- [ ] Add/remove destinations from collection
- [ ] Share public collections

### 4h. Profile / Account
- [ ] Profile view (display name, bio, avatar, location, website)
- [ ] Saved places tab via saved_places data
- [ ] Visited places tab via visited_places data
- [ ] Collections tab
- [ ] Trips tab
- [ ] Edit profile
- [ ] Settings: privacy, notifications, data export, delete account
- [ ] Public profile view for other users via `/user/[username]`
- [ ] Follow/unfollow users

### 4i. City View
- [ ] City detail page with all destinations in that city
- [ ] Group by category
- [ ] City-level map
- [ ] Best time to visit via intelligence endpoints
- [ ] Neighborhoods/districts breakdown

---

## Phase 5: Offline & Persistence

- [ ] Core Data or SwiftData for local caching
- [ ] Cache destination data for offline viewing
- [ ] Cache saved/visited places locally
- [ ] Queue save/unsave/visit actions when offline, sync when back online
- [ ] Cache search results for recent queries
- [ ] Download trip itineraries for offline access
- [ ] Image caching via Kingfisher/Nuke disk cache

---

## Phase 6: Native iOS Features

- [ ] Push notifications (APNs) — trip reminders, price alerts
- [ ] Haptic feedback on save/visit/like actions
- [ ] Spotlight search integration (index saved destinations)
- [ ] Widgets — upcoming trip, destination of the day
- [ ] Live Activities — active trip day view
- [ ] Share extension — save links to collections
- [ ] Handoff support with web app
- [ ] Dynamic Type for accessibility
- [ ] VoiceOver accessibility labels on all interactive elements
- [ ] Dark mode support (system-aware)
- [ ] App Intents / Siri Shortcuts ("Show my trip", "Search restaurants in London")

---

## Phase 7: Deep Linking & Navigation

- [ ] URL scheme: `urbanmanual://`
- [ ] Universal Links: `urbanmanual.co/destination/[slug]`, `/city/[slug]`, `/trips`
- [ ] Configure Associated Domains entitlement
- [ ] Add `apple-app-site-association` file to web backend
- [ ] Handle incoming deep links → navigate to correct screen
- [ ] Share sheet generates correct deep link URLs

---

## Phase 8: Analytics & Monitoring

- [ ] Sentry iOS SDK for crash reporting
- [ ] Screen view tracking
- [ ] Search query analytics
- [ ] Feature usage events (save, visit, trip create, chat)
- [ ] Performance monitoring (API latency, app launch time)

---

## Phase 9: Testing

- [ ] Unit tests for ViewModels and Services
- [ ] Unit tests for data model decoding (JSON → Swift structs)
- [ ] UI tests for critical flows (login, search, save destination, create trip)
- [ ] Snapshot tests for key screens
- [ ] Test offline mode behavior
- [ ] Test deep link routing

---

## Phase 10: App Store Prep

- [ ] App icon (1024x1024 + all sizes)
- [ ] Launch screen / splash
- [ ] App Store screenshots (6.7", 6.1", iPad if applicable)
- [ ] App Store description and keywords
- [ ] Privacy policy URL
- [ ] App privacy nutrition labels (data collection disclosure)
- [ ] Review guidelines compliance check
- [ ] TestFlight beta distribution setup
- [ ] Configure App Store Connect metadata
- [ ] Submit for review

---

## API Quick Reference

| Feature | Method | Endpoint |
|---------|--------|----------|
| Homepage feed | GET | `/api/homepage/destinations` |
| Filters | GET | `/api/homepage/filters` |
| Destination detail | GET | `/api/destinations/[slug]/enriched` |
| Nearby | GET | `/api/destinations/nearby?lat=&lng=&radius=` |
| Search autocomplete | GET | `/api/search/autocomplete?q=` |
| Hybrid search | GET | `/api/search/hybrid?q=&limit=&offset=` |
| Semantic search | POST | `/api/search/semantic` |
| Recommendations | GET | `/api/recommendations/hybrid` |
| Discovery | GET | `/api/recommendations/discovery` |
| Trips list | GET | `/api/trips` |
| Trip create | POST | `/api/trips` |
| Trip detail | GET | `/api/trips/[id]` |
| Itinerary items | GET | `/api/trips/[id]/items` |
| AI chat | POST | `/api/ai-chat` |
| Collections | GET/POST | `/api/collections` |
| MapKit token | GET | `/api/mapkit-token` |
| User profile | GET/PUT | `/api/account/profile` |
| Saved places | GET/POST | `/api/saved-places` |
| Visited places | GET/POST | `/api/visited-places` |
| Follow user | POST | `/api/account/follow` |

---

## Notes

- All authenticated endpoints expect Supabase JWT in `Authorization: Bearer <token>` header
- Pagination uses `?limit=20&offset=0` pattern
- Rate limited responses return 429 with `retryAfter` field
- Chat endpoints support SSE streaming
- Images are served from Supabase Storage — use appropriate size transforms
