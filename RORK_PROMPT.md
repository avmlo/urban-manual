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

### Authentication
- Sign in with Apple (required for iOS)
- Sign in with Google
- Email/password option
- The app should work in browse-only mode without authentication, but saving, visiting, trips, chat, and social features require login

### Data & Backend
- The app connects to a Supabase backend (PostgreSQL database)
- REST API endpoints are available at urbanmanual.co/api/* for all data operations
- Key data model: destinations have slug, name, city, country, category, description, image, latitude, longitude, rating, michelin_stars, tags, opening_hours, etc.
- Real-time updates via Supabase subscriptions where appropriate (e.g., trip collaboration)

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
