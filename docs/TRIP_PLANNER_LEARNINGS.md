# Trip Planner Learnings from itskovacs/trip

Analysis of [itskovacs/trip](https://github.com/itskovacs/trip) — a self-hosted, privacy-first map tracker and trip planner (~1,100 stars, MIT license). The goal is to identify patterns and features that can strengthen Urban Manual's trip planning capabilities.

---

## Key Takeaways

### 1. Trip Sharing via Token-Based URLs

**What TRIP does:** Generates a unique share token per trip. Anyone with the URL (`/s/t/:token`) gets a read-only view — full map, itinerary, packing list, attachments — no auth required.

**Why it matters:** Urban Manual already defines `TripVisibility` (private, shared, public) and `TripCollaborator` types in `types/trip.ts`, but has zero sharing implementation. This is the single highest-impact gap.

**Implementation path:**
- Add a `share_token` column to the `trips` table (nullable UUID, unique index)
- API endpoint `POST /api/trips/[id]/share` to generate/revoke tokens
- Public route `/trips/shared/[token]` with a read-only trip viewer component
- No auth middleware on the shared route — validate token server-side instead

### 2. Expense Splitting and Budget Tracking

**What TRIP does:** Each itinerary item has a `cost` and `paid_by` field. A `/api/trips/{id}/balance` endpoint calculates who owes whom across all trip members — Splitwise-style, built into the planner.

**Why it matters:** Urban Manual has no budget tracking at all. For a travel guide with 897+ destinations, cost awareness during trip planning is a natural extension.

**Implementation path:**
- Add `estimated_cost` and `currency` fields to itinerary items
- Add a `TripBudget` component showing per-day and total spend
- For collaboration (future): track `paid_by` per item and compute balances
- Category-based cost estimation as a starting point (use destination price level data already in the DB)

### 3. Packing Lists and Checklists

**What TRIP does:** Trips include categorized packing lists (clothes, toiletries, tech, documents) and pre-trip preparation checklists with completion tracking.

**Why it matters:** These are lightweight, high-value features that increase engagement with the trip planner without requiring external API integrations.

**Implementation path:**
- New `trip_packing_items` table: `trip_id, category, label, is_checked`
- New `trip_checklist_items` table: `trip_id, label, is_checked, is_watchlist`
- UI: collapsible sections within the trip detail view
- AI enhancement: generate suggested packing lists based on destination climate/activities

### 4. Calendar and CSV Export

**What TRIP does:** Export trip days as `.ics` calendar events and trip data as CSV. Also has a "pretty print" mode with selectable display properties.

**Why it matters:** Urban Manual has GDPR-compliant account export but no trip-specific exports. Calendar export alone dramatically increases utility — users can see their itinerary in Google Calendar, Apple Calendar, or Outlook.

**Implementation path:**
- `GET /api/trips/[id]/export/ical` — generate `.ics` with VEVENT per itinerary item (date, time, location, description)
- `GET /api/trips/[id]/export/csv` — tabular export of items with day, time, destination, category, notes
- Use the `ics` npm package (small, well-maintained) for calendar generation
- Add export buttons to the trip detail UI

### 5. Map Provider Abstraction (Strategy Pattern)

**What TRIP does:** Defines a `BaseMapProvider` interface with implementations for Google Maps and OSM/Nominatim. The active provider is swappable per user via settings. Bulk imports auto-detect Google Maps URLs and switch providers for those items.

**Why it matters:** Urban Manual currently uses Google Maps and Mapbox. A provider abstraction would make it easier to add or swap mapping services without touching business logic.

**Relevance:** Lower priority for now — Urban Manual's mapping needs are different (display-oriented vs. POI-management-oriented). But worth noting for future architecture work.

### 6. Efficient Map Marker Diffing

**What TRIP does:** Instead of clearing and re-rendering all markers on every state change, it diffs the current marker set against the desired set — removing obsolete markers and adding only new ones.

**Why it matters:** Urban Manual has 897+ destinations. If the trip map view shows many POIs, naive re-rendering will cause jank. This pattern is directly applicable.

**Implementation path:**
- When rendering trip destinations on a map, maintain a `Map<id, marker>` reference
- On data change, compute the diff and apply add/remove operations only
- Combine with marker clustering (which TRIP also uses via `leaflet.markercluster`)

### 7. Item Status Tracking

**What TRIP does:** Each itinerary item has a status: `pending`, `confirmed`, `constraint`, `optional`. The "constraint" status is for items dependent on external factors (reservation confirmations, ticket availability).

**Why it matters:** Urban Manual's itinerary items have no status field. Adding this gives users a way to track booking progress during trip planning.

**Implementation path:**
- Add `status` enum to itinerary items: `idea`, `planned`, `booked`, `skipped`
- Visual indicators in the itinerary UI (color-coded badges)
- Filter/sort by status within a trip

### 8. GPX Route Support

**What TRIP does:** Supports GPX file uploads for hiking/cycling routes, rendered as polylines on the map alongside POI markers.

**Why it matters:** Niche but valuable for adventure travel content. Urban Manual could support GPX for hiking destinations or curated walking tours.

**Relevance:** Lower priority. Worth considering as a differentiator for specific destination categories.

### 9. Collaborator Roles with Scoped Permissions

**What TRIP does:** Trip members have roles (owner, editor, viewer). All data queries are scoped to ownership. A `verify_exists_and_owns()` utility enforces this at the API layer.

**Why it matters:** Urban Manual already defines `CollaboratorRole` in types but has no implementation. When building collaboration, TRIP's pattern of enforcing ownership at the API layer (not just UI) is the right approach.

**Implementation path:**
- `trip_collaborators` table: `trip_id, user_id, role, invited_at, accepted_at`
- Middleware or utility function that checks trip access on every trip API route
- Invitation flow: owner sends invite → invitee accepts → gains role-based access

### 10. Google Data Import

**What TRIP does:** Three import pathways — Google Takeout CSV, Google MyMaps KMZ, and Google Maps shortlink resolution. Batch processing with rate limiting (10 items per request, 2.5s intervals).

**Why it matters:** Letting users import their existing Google Maps saved places would be a powerful onboarding tool for Urban Manual. Many travelers already have extensive saved lists in Google Maps.

**Implementation path:**
- Start with Google Maps shortlink resolution (simplest: resolve URL → extract coordinates → match to nearest Urban Manual destination)
- Add CSV import for Google Takeout data
- Rate-limit batch operations with `asyncio.Semaphore` equivalent (or simple queue)

---

## Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | Trip sharing (token URLs) | Medium | High |
| **P0** | Calendar export (.ics) | Low | High |
| **P1** | Item status tracking | Low | Medium |
| **P1** | Budget/cost tracking | Medium | Medium |
| **P1** | Packing lists & checklists | Low | Medium |
| **P2** | Collaborator roles | High | High |
| **P2** | CSV export | Low | Low |
| **P2** | Marker diffing on maps | Medium | Medium |
| **P3** | Google data import | High | Medium |
| **P3** | GPX route support | Medium | Low |

---

## Architecture Notes

TRIP's backend is FastAPI + SQLite (self-hosted simplicity). Urban Manual uses Next.js API routes + Supabase. The patterns translate well:

- **TRIP's provider abstraction** → Use a service layer in `lib/` or `services/` with interface-like patterns
- **TRIP's ownership scoping** → Supabase Row Level Security (RLS) policies accomplish the same thing declaratively
- **TRIP's batch operations** → Next.js API routes with proper error collection (return partial results, not all-or-nothing)
- **TRIP's event-driven cleanup** → Supabase triggers or database functions for cascade operations (e.g., delete trip → delete related items)

The key architectural difference: TRIP is a self-hosted tool where users own their instance. Urban Manual is a hosted platform where multiple users share infrastructure. This means RLS policies and proper multi-tenant data isolation are non-negotiable — Urban Manual's Supabase setup already supports this, but new tables must include RLS policies from day one.
