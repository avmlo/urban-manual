# Urban Manual — Project Outline

> Curated travel guide web application featuring 897+ destinations worldwide with AI-powered recommendations, interactive maps, user accounts, and editorial content.
>
> **Production**: https://www.urbanmanual.co

---

## Tech Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | Next.js 16 (App Router), React 19, TypeScript 5        |
| Styling          | Tailwind CSS v4, Radix UI, Framer Motion                |
| Database         | Supabase (PostgreSQL)                                   |
| Auth             | Supabase Auth (Google OAuth, Apple Sign-In)             |
| AI / ML          | Google Gemini, OpenAI, Google Discovery Engine, Upstash Vector |
| State            | React Context, Zustand, React Query, tRPC               |
| Maps             | Google Maps, Mapbox, Apple MapKit JS                    |
| CMS              | Custom Admin CMS, Plasmic (visual builder)              |
| Jobs / Queue     | Inngest, Upstash QStash                                 |
| Feature Flags    | Statsig                                                 |
| Monitoring       | Sentry, Vercel Analytics, Google Analytics              |
| Deployment       | Vercel                                                  |

---

## Codebase Statistics

| Metric                   | Count   |
| ------------------------ | ------- |
| TypeScript / TSX files   | ~1,259  |
| React components         | ~200+   |
| Custom hooks             | 45      |
| API route endpoints      | 218     |
| API endpoint categories  | 92      |
| Core type definitions    | 12      |
| Services                 | 8       |
| Lib modules (dirs)       | 37+     |
| Documentation files      | 52      |
| Supabase migrations      | 60      |

---

## Directory Structure

```
/
├── app/                        # Next.js App Router — pages & API routes
│   ├── api/                    #   218 route handlers across 92 categories
│   ├── (home)/                 #   Home route group
│   ├── (routes)/               #   Additional route groups
│   ├── about/
│   ├── account/                #   User account (profile, preferences, privacy, security, export, insights)
│   ├── admin/                  #   Admin dashboard (17 sub-routes: analytics, destinations, users, etc.)
│   ├── architect/[slug]/       #   Architect detail pages
│   ├── auth/                   #   Login, logout, password reset, OAuth callback
│   ├── brand/[brand]/          #   Brand pages
│   ├── category/[category]/    #   Category browse
│   ├── chat/                   #   AI chat interface
│   ├── city/[city]/            #   City detail pages
│   ├── collection/[id]/        #   Collection management
│   ├── destination/[slug]/     #   Destination detail pages
│   ├── discover/               #   Discovery feature
│   ├── explore/                #   Explore page
│   ├── feed/ & feed.xml/       #   RSS feed
│   ├── intelligence/           #   Intelligence dashboard
│   ├── map/                    #   Interactive map
│   ├── movement/[slug]/        #   Design movement pages
│   ├── search/                 #   Search page
│   ├── trips/[id]/             #   Trip planner
│   ├── user/[username]/        #   User profiles
│   ├── layout.tsx              #   Root layout with providers (13 KB)
│   ├── page.tsx                #   Homepage entry (delegates to page-client)
│   └── page-client.tsx         #   Homepage client component (129 KB, 3,442 lines)
│
├── components/                 # ~200+ React components
│   ├── (160+ root components)  #   Organized by domain: AI, maps, cards, search, trips, admin
│   ├── account/                #   Account tab components
│   ├── badges/                 #   Google Rating, Michelin badges
│   ├── icons/                  #   Untitled UI icon system
│   ├── plasmic/                #   Plasmic CMS integration
│   └── search-session/         #   Unified search UI
│
├── contexts/                   # React context providers
│   ├── AuthContext.tsx          #   Authentication state
│   ├── DrawerContext.tsx        #   Drawer / modal state
│   ├── TripBuilderContext.tsx   #   Trip planning state (45 KB)
│   ├── AdminEditModeContext.tsx #   Admin editor mode
│   └── ChristmasThemeContext.tsx
│
├── hooks/                      # 45 custom React hooks
│   ├── useTrip.ts              #   Trip management
│   ├── useSearchSession.ts     #   Search session state
│   ├── useML*.ts               #   ML hooks (anomaly, explain, recommendations, sentiment, topics)
│   ├── useGeolocation.ts       #   Location services
│   ├── useCollections.ts       #   Collection management
│   ├── useBehaviorTracking.ts  #   Analytics tracking
│   └── ... (40 more)
│
├── lib/                        # Utility libraries & services (37+ dirs)
│   ├── supabase/               #   Supabase client (browser) & server helpers
│   ├── ai/                     #   AI integrations
│   ├── agents/                 #   AI agents (itinerary builder, proactive recommendations)
│   ├── search/                 #   Semantic search, reranking, query expansion
│   ├── embeddings/             #   Vector embeddings (Upstash)
│   ├── intelligence/           #   Travel intelligence core
│   ├── ml/                     #   ML utilities
│   ├── discovery-engine/       #   Google Discovery Engine integration
│   ├── analytics/              #   Event tracking & performance metrics
│   ├── errors/                 #   Error handling (withErrorHandling, createValidationError)
│   ├── security/               #   Security utilities
│   ├── sanitize/               #   HTML sanitization (DOMPurify)
│   ├── stores/                 #   Zustand store definitions
│   ├── trip/                   #   Trip planning domain model & utilities
│   ├── trpc/                   #   tRPC configuration
│   ├── openai/                 #   OpenAI integration (vision, TTS, assistants, alt-text)
│   ├── inngest/                #   Background job definitions
│   ├── rate-limit.ts           #   Upstash Redis rate limiting
│   ├── upstash-vector.ts       #   Vector DB wrapper
│   ├── gemini.ts               #   Gemini AI wrapper
│   └── constants.ts            #   App-wide constants
│
├── services/                   # External service integrations
│   ├── intelligence/           #   Travel Intelligence Core (30 modules)
│   │   ├── engine.ts           #     Main intelligence engine
│   │   ├── unified-intelligence-core.ts
│   │   ├── intent-analysis.ts  #     User intent parsing
│   │   ├── knowledge-graph.ts  #     Knowledge graph
│   │   ├── itinerary.ts        #     Itinerary generation
│   │   ├── multi-day-planning.ts
│   │   ├── recommendations-advanced.ts
│   │   ├── taste-profile-evolution.ts
│   │   ├── best-time-to-visit.ts
│   │   ├── conversation-memory.ts
│   │   └── ... (20 more modules)
│   ├── ai-gateway/             #   AI service orchestration
│   ├── recommendations/        #   Recommendation algorithms
│   ├── search/                 #   Search with Discovery Engine
│   ├── search-session/         #   Search session management
│   ├── architecture/           #   Architecture data enrichment
│   ├── forecasting/            #   Travel forecasting
│   ├── realtime/               #   Real-time updates
│   └── gemini.ts               #   Gemini AI service wrapper
│
├── types/                      # TypeScript type definitions
│   ├── destination.ts          #   Core Destination interface (30+ fields)
│   ├── trip.ts                 #   Trip planning types
│   ├── database.ts             #   Database schema types
│   ├── personalization.ts      #   User preference types
│   ├── achievement.ts          #   Achievement system types
│   ├── architecture.ts         #   Architecture info types
│   ├── search-session.ts       #   Search session types
│   └── ... (5 more)
│
├── src/                        # Alternative component structure (3.8 MB)
│   ├── ui/                     #   Base UI components
│   ├── features/               #   Feature modules
│   └── domain/                 #   Domain models
│
├── features/                   # Feature modules (112 KB)
├── intelligence/               # Intelligence algorithms & API
├── server/                     # tRPC server (37 KB)
│
├── scripts/                    # CLI scripts for data operations
├── tests/                      # Unit tests (Vitest)
├── supabase/                   # Supabase migrations (60 SQL files) & config
├── ml-service/                 # Python ML microservice (324 KB)
├── mcp-server/                 # Model Context Protocol Server (205 KB)
├── automation/                 # N8N workflow definitions
├── drizzle/                    # Drizzle ORM migrations
├── docs/                       # 52 documentation files (guides, audits, security)
├── public/                     # Static assets (icons, images, manifest)
│
├── next.config.ts              # Next.js config (CSP, images, PWA, Sentry)
├── middleware.ts               # Auth middleware for admin routes
├── package.json                # 130+ dependencies
├── tsconfig.json               # Strict mode, path aliases (@/*)
├── tailwind.config.js          # Custom theme, animations, fonts
├── vitest.config.ts            # Test configuration
├── eslint.config.mjs           # Flat config ESLint
├── capacitor.config.ts         # Mobile app config (Capacitor)
└── plasmic-init.ts             # Plasmic CMS initialization
```

---

## Core Data Model

### Destination (primary entity)

```typescript
interface Destination {
  id?: number;
  slug: string;               // URL-friendly identifier
  name: string;
  city: string;
  country?: string;
  category: string;           // restaurant, hotel, bar, cafe, shop, etc.
  description?: string;
  micro_description?: string; // AI-generated short description
  image?: string;
  latitude?: number;
  longitude?: number;
  michelin_stars?: number;
  rating?: number;
  // 20+ additional fields (see types/destination.ts)
}
```

### Database Tables

| Table               | Purpose                          |
| ------------------- | -------------------------------- |
| `destinations`      | All travel destinations (~900)   |
| `visited_places`    | User's visited destinations      |
| `saved_places`      | User's saved/bookmarked places   |
| `user_preferences`  | User taste profiles              |
| `collections`       | User-created collections         |
| `trips`             | Trip planning data               |
| `architects`        | Architecture/designer info       |
| `movements`         | Architectural movements          |

---

## API Surface (92 Endpoint Categories, 218 Routes)

### AI & Intelligence
- `/api/ai-chat` — AI-powered chat
- `/api/gemini` — Gemini AI interactions
- `/api/gemini-recommendations` — AI recommendations
- `/api/gemini-place-recommendations` — Place-specific AI recs
- `/api/intelligence/*` — Travel intelligence endpoints
- `/api/smart-chat` — Smart conversation engine
- `/api/concierge` — AI concierge
- `/api/agents` — AI agent interactions
- `/api/intent` — Intent analysis
- `/api/context` — Contextual awareness

### Search
- `/api/search/ai` — AI-powered search
- `/api/search/semantic` — Semantic search (vector-based)
- `/api/search/combined` — Combined search strategies
- `/api/search/instant` — Instant search
- `/api/search/intelligent` — Intelligent search
- `/api/search/discovery` — Discovery-mode search
- `/api/search/suggest` — Search suggestions
- `/api/search/follow-up` — Follow-up queries
- `/api/search/refine` — Query refinement
- `/api/autocomplete` — Autocomplete
- `/api/contextual-search` — Context-aware search

### Destinations & Content
- `/api/destinations/*` — CRUD for destinations
- `/api/cities/*` — City data
- `/api/categories/*` — Category data
- `/api/brands/*` — Brand data
- `/api/related-destinations` — Related content
- `/api/similar` — Similar destinations
- `/api/nearby` — Nearby places
- `/api/trending` — Trending destinations

### User & Account
- `/api/account/*` — Account management
- `/api/users/*` — User profiles
- `/api/collections/*` — Collection management
- `/api/achievements` — Achievement system
- `/api/personalization` — Taste profile
- `/api/personalized-recommendations` — Personal recs
- `/api/behavior` — Behavior tracking
- `/api/memory` — Conversation memory

### Trip Planning
- `/api/trips/*` — Trip CRUD
- `/api/itinerary/*` — Itinerary management
- `/api/generate-itinerary` — AI itinerary generation
- `/api/distance` — Distance calculations
- `/api/weather` — Weather data

### Maps & Location
- `/api/location` — Location services
- `/api/google-places-search` — Google Places
- `/api/google-places-autocomplete` — Places autocomplete
- `/api/google-place-photo` — Place photos
- `/api/mapkit-token` — Apple MapKit token
- `/api/visited-countries` — Visited countries map data

### Admin
- `/api/admin/*` — Admin operations
- `/api/is-admin` — Admin check
- `/api/enrich` — Data enrichment
- `/api/enrich-google` — Google Places enrichment
- `/api/regenerate-content` — Content regeneration

### Infrastructure
- `/api/health` — Health check
- `/api/build-version` — Build info
- `/api/csrf` — CSRF tokens
- `/api/cron/*` — Scheduled jobs
- `/api/realtime` — Real-time updates
- `/api/upload-image` — Image upload
- `/api/trpc/*` — tRPC endpoints

---

## Feature Architecture

### AI / ML Pipeline

```
User Query
  → Intent Analysis (deep-intent-analysis.ts)
  → Query Expansion & Context (rich-query-context.ts)
  → Multi-Strategy Search
      ├── Semantic Search (Upstash Vector)
      ├── Google Discovery Engine
      └── Supabase Full-Text Search
  → Search Ranking (search-ranking.ts)
  → Personalized Recommendations (taste-profile-evolution.ts)
  → Response Generation (Gemini / OpenAI)
```

**AI Agents:**
- Itinerary Builder Agent (`lib/agents/itinerary-builder-agent.ts`)
- Proactive Recommendation Agent (`lib/agents/proactive-recommendation-agent.ts`)

**ML Microservice** (`ml-service/`): Separate Python service for ML model serving.

### Travel Intelligence System (`services/intelligence/`)

30 modules providing:
- Intent analysis (shallow + deep)
- Contextual recommendations
- Knowledge graph traversal
- Itinerary generation (single & multi-day)
- Best time to visit analysis
- Neighborhood / district intelligence
- Opportunity detection
- Taste profile evolution
- Conversation memory
- Architectural journey planning
- Forecasting

### Search System

Multiple search strategies unified under `/api/search/`:
- **Instant** — Fast prefix/keyword matching
- **Semantic** — Vector similarity via Upstash
- **AI** — Gemini-powered natural language
- **Discovery** — Google Discovery Engine
- **Combined** — Merges multiple strategies with reranking

### Trip Planner

- Domain model: `lib/trip/domain/`
- Context: `contexts/TripBuilderContext.tsx` (45 KB)
- Hooks: `useTrip`, `useTripRealtime`, `useStreamingItinerary`, `useSyncFlightItems`, `useSyncHotelItems`
- AI generation: itinerary builder agent + Gemini
- Real-time collaboration via Supabase Realtime

### Authentication & Authorization

- Supabase Auth (Google OAuth, Apple Sign-In)
- Middleware (`middleware.ts`) protects admin routes
- Admin check: `role: 'admin'` in user metadata
- CSRF protection, rate limiting (Upstash Redis)

---

## State Management

| Layer          | Tool                | Usage                              |
| -------------- | ------------------- | ---------------------------------- |
| Server state   | React Query / tRPC  | Data fetching, caching, mutations  |
| Global client  | Zustand             | Stores in `lib/stores/`            |
| Feature scoped | React Context       | Auth, Drawer, Trip Builder, Admin  |
| URL state      | `useUrlState` hook  | Search filters, pagination         |
| Optimistic     | `useOptimistic`     | Instant UI feedback                |

---

## Infrastructure & DevOps

| Concern        | Solution                           |
| -------------- | ---------------------------------- |
| Hosting        | Vercel (automatic deploys from GitHub) |
| Database       | Supabase PostgreSQL                |
| File storage   | Supabase Storage                   |
| Caching        | Upstash Redis                      |
| Vector DB      | Upstash Vector                     |
| Background jobs| Inngest, QStash                    |
| Error tracking | Sentry                             |
| Feature flags  | Statsig                            |
| Rate limiting  | Upstash Redis (`lib/rate-limit.ts`)|
| Security       | CSP headers, DOMPurify, CSRF tokens|
| Monitoring     | Sentry, Vercel Analytics, GA       |

---

## Commands

```bash
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # ESLint
npm run test:unit              # Vitest unit tests
npm run test:intelligence      # Intelligence endpoint tests
npm run enrich                 # Run destination enrichment
npm run enrich:google          # Google Places enrichment
npm run enrich:exa             # Exa search enrichment
npm run backfill-embeddings    # Generate vector embeddings
npm run plasmic:sync           # Sync Plasmic CMS
npm run mcp:dev                # MCP server dev mode
```

---

## Key Configuration

| File                | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `next.config.ts`    | CSP headers, image domains, PWA, Sentry, redirects |
| `tsconfig.json`     | Strict TS, path aliases (`@/*`, `@/ui/*`, `@/features/*`, `@/domain/*`) |
| `tailwind.config.js`| Inter + Playfair Display fonts, custom animations |
| `middleware.ts`      | Admin route protection                       |
| `eslint.config.mjs` | Flat config, Next.js core web vitals         |
| `.prettierrc`        | 2 spaces, double quotes, trailing commas (es5) |
| `vitest.config.ts`  | Unit test config                              |
| `capacitor.config.ts`| Mobile app (Capacitor) config                |

---

## Documentation Index (`docs/`)

**Guides (28 files):** Architecture, AutoRAG, Database Migration, Deployment, Discovery Engine, Enrichment, Google Cloud, Google Places API, Image Migration, iOS Deployment, Plasmic Setup, Supabase CLI, and more.

**Audits (18 files):** Comprehensive audits covering AI integration, code review, browser compatibility, design system, destination drawer, Discovery Engine utilization, map features, security, SEO, travel intelligence, and UI/UX.

**Security:** `SECURITY.md`, `SECURITY_AUDIT_REPORT.md`, `docs/security/service-matrix.md`

**Design:** `DESIGN_SYSTEM.md`, `DESIGN_AUDIT.md`, `UI_AUDIT_2025.md`
