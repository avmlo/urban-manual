# Admin CMS Improvement Plan

## Current State

The admin CMS is a comprehensive content management system built with Next.js App Router, React, TypeScript, and Supabase. It currently includes:

- **Dashboard** — Key metrics, data quality alerts, recent destinations, city distribution (12+ client-side Supabase queries)
- **Destinations CMS** (ContentManager) — Table/grid view with search, filters, sorting, pagination, completeness scoring, bulk selection
- **Destination Editor** (DestinationForm) — 7-tab form (Details, Location, Media, Content, Architecture, Booking, Data) with autosave, Google Places integration, image upload
- **Data Manager** — Generic CRUD for cities, countries, neighborhoods, brands, architects with merge/sync/inline-editing
- **Analytics** — Advanced dashboard with date ranges, daily views, top destinations/searches, CSV export
- **Search Insights** — Search query analytics
- **User Management** — User list with pagination, filters, activity stats
- **Media Library** — File management in Supabase Storage
- **Enrichment Tools** — Single/batch Google Places enrichment
- **Settings** — General/security/notification/theme settings (currently local state only)
- **Reindex** — Vector DB reindexing tool
- **Discover** — Feed curation
- **Command Palette** — Cmd+K navigation

---

## Identified Gaps

| # | Gap | Severity |
|---|-----|----------|
| 1 | Settings stored in localStorage, never persisted to database | High |
| 2 | No audit trail — `content_audit_log` table exists but is never written to | High |
| 3 | No content versioning/history — changes overwrite previous version | Medium |
| 4 | No scheduling/drafts — destinations go live immediately | High |
| 5 | No rich text editor — content fields use plain textarea, `htmlToPlainText()` strips HTML on edit | High |
| 6 | Limited bulk operations — no bulk city change, tag assignment, or field edit | Medium |
| 7 | No CSV/JSON import for bulk destination creation | High |
| 8 | No image optimization/cropping tools | Medium |
| 9 | Dashboard makes 12+ separate client-side Supabase queries | High |
| 10 | No real-time collaboration or edit locking | Low |
| 11 | No SEO management — no meta title/description, no sitemap controls | High |
| 12 | No notifications/alerts delivery mechanism | Low |
| 13 | Minimal form validation — no required field indicators, no slug uniqueness check | High |
| 14 | Media library lacks folders and tagging | Medium |
| 15 | No content approval workflow — single admin role | Low |

---

## Phase 1: Quick Wins

### 1.1 Persist Settings to Database

**Gap**: #1 — Settings use `localStorage` only; the "save" simulates persistence with a `setTimeout`.

**Plan**:
- Create `admin_settings` table (singleton-row pattern matching `homepage_config`):
  ```sql
  CREATE TABLE IF NOT EXISTS admin_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
  );
  ```
- Create API route `app/api/admin/settings/route.ts` with `GET`/`PUT` handlers using `withErrorHandling` and admin auth
- Update settings page to fetch on mount and persist via API on save
- Keep localStorage as a cache layer for immediate UI responsiveness

**Files**:
- `supabase/migrations/` — new migration
- `app/api/admin/settings/route.ts` — new
- `app/admin/settings/page.tsx` — replace localStorage logic

---

### 1.2 Add Form Validation to DestinationForm

**Gap**: #13 — Only a single `required` attribute on slug input; `handleSubmit` performs no validation before saving.

**Plan**:
- Add validation function checking: `name` (required, min 2 chars), `slug` (required, valid chars, unique via debounced Supabase query), `city` (required), `category` (required)
- Add visual indicators: asterisks on required labels, red borders, inline error messages
- Block form submission until validation passes
- Add slug uniqueness check with debounced API call

**Files**:
- `src/features/admin/components/DestinationForm.tsx` — validation logic and UI
- `app/admin/destinations/page.tsx` — ensure validation errors visible in drawer

---

### 1.3 Expand Bulk Operations in ContentManager

**Gap**: #6 — Existing bulk actions cover delete, category change, crown toggle, enrich, and export. Missing: bulk city change, neighborhood assignment, tag management.

**Plan**:
- Add "Bulk Edit" popover for `city` and `neighborhood` fields using the existing `SearchableSelect` pattern
- Add "Bulk Assign Tags" that appends tags to all selected destinations
- Follow the `handleBulkCategoryChange` pattern: `supabase.from('destinations').update({...}).in('id', Array.from(selectedItems))`

**Files**:
- `src/features/admin/components/cms/ContentManager.tsx` — add bulk edit popovers to bulk actions bar

---

### 1.4 Dashboard Server-Side Aggregation Endpoint

**Gap**: #9 — `DashboardOverview` fires 12 parallel Supabase queries client-side, including one fetching ALL destinations just for city counts.

**Plan**:
- Create `app/api/admin/dashboard/route.ts` running all queries server-side, returning a single JSON response
- Optionally create a Supabase SQL function `get_dashboard_stats()` for single-roundtrip computation
- Update `DashboardOverview` to call `fetch('/api/admin/dashboard')` instead of 12 individual queries

**Files**:
- `app/api/admin/dashboard/route.ts` — new
- `src/features/admin/components/dashboard/DashboardOverview.tsx` — replace 12 queries with single fetch
- `supabase/migrations/` — optional SQL function

---

## Phase 2: Short-term

### 2.1 Implement Audit Trail

**Gap**: #2 — `content_audit_log` table and `get_destination_history()` function exist in the database but are never written to from the admin CMS.

**Plan**:
- Create utility `lib/audit.ts` exposing `logAuditEvent(action, slug, changes, userId)` inserting into `content_audit_log`
- Integrate into destination save flow (`app/admin/destinations/page.tsx` — `handleSaveDestination` and `performAutosave`)
- Integrate into DataManager save/delete operations
- Integrate into `app/api/admin/data/route.ts` for server-side operations
- Add "Activity Log" section to dashboard showing recent audit entries using the existing `get_destination_history()` function
- Show change history in DestinationForm's "Data" tab

**Files**:
- `lib/audit.ts` — new utility
- `app/api/admin/data/route.ts` — add audit logging
- `app/admin/destinations/page.tsx` — add audit logging to save flows
- `src/features/admin/components/dashboard/DashboardOverview.tsx` — add activity section

---

### 2.2 Add CSV/JSON Import for Destinations

**Gap**: #7 — ContentManager has CSV export but no import capability.

**Plan**:
- Add "Import" button next to "Add New" in ContentManager header
- Create import modal accepting CSV or JSON file upload
- CSV flow: parse headers → column mapping UI → validate rows → preview with error highlighting → batch insert
- JSON flow: validate array of Destination objects → preview → insert
- Create `app/api/admin/import/route.ts` for server-side validation and bulk insert
- Show progress indicator during import
- Handle duplicates by slug: skip, overwrite, or merge strategies

**Files**:
- `src/features/admin/components/cms/ImportModal.tsx` — new
- `src/features/admin/components/cms/ContentManager.tsx` — add import button
- `app/api/admin/import/route.ts` — new

---

### 2.3 Add Content Status Workflow (Draft/Published/Archived)

**Gap**: #4 — No `status` column; all destinations go live immediately.

**Plan**:
- Migration: `ALTER TABLE destinations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));`
- Update `Destination` type in `types/destination.ts`
- Add status selector in DestinationForm Details tab (three-state button group)
- Add status filter in ContentManager alongside existing filters
- **Critical**: Update all public-facing queries to filter `WHERE status = 'published'` (homepage, detail page, search, APIs)
- New destinations default to `draft`; require explicit publish action
- Add bulk status change to ContentManager bulk actions

**Files**:
- `supabase/migrations/` — new migration
- `types/destination.ts` — add status field
- `src/features/admin/components/DestinationForm.tsx` — status selector
- `src/features/admin/components/cms/ContentManager.tsx` — status filter, bulk status change
- `app/page.tsx` — filter by published status
- All public API routes querying destinations

---

### 2.4 Add Media Library Folders and Tagging

**Gap**: #14 — Flat file listing; all files dumped in root of `media` bucket.

**Plan**:
- Support virtual folders via path prefixes in Supabase Storage (e.g., `destinations/`, `brands/`, `general/`)
- Add folder sidebar or breadcrumb navigation (Supabase `.list()` already supports path prefix filtering)
- Create `media_metadata` table:
  ```sql
  CREATE TABLE media_metadata (
    path TEXT PRIMARY KEY,
    tags TEXT[],
    alt_text TEXT,
    linked_destination_slug TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- Add tag input to media preview modal
- Add filter-by-tag functionality

**Files**:
- `supabase/migrations/` — new migration
- `src/features/admin/components/cms/MediaLibrary.tsx` — folder navigation, tag UI
- `app/api/admin/media/route.ts` — new API for metadata CRUD

---

## Phase 3: Medium-term

### 3.1 Rich Text Editor for Content Fields

**Gap**: #5 — Content fields use plain `<textarea>`; `htmlToPlainText()` strips all HTML on edit.

**Plan**:
- Integrate Tiptap (headless rich text editor for React)
- Create `src/ui/rich-text-editor.tsx` wrapping Tiptap with toolbar (bold, italic, links, headings, lists, blockquotes)
- Replace `<textarea>` for `content`, `description`, and `design_story` fields
- Keep `micro_description` and `editorial_summary` as plain text
- Remove `htmlToPlainText()` calls on form initialization for rich text fields; use `sanitizeHtml()` with `richText` preset on save
- Debounce rich text `onUpdate` for autosave integration

**Files**:
- `src/ui/rich-text-editor.tsx` — new
- `src/features/admin/components/DestinationForm.tsx` — replace textarea, remove `htmlToPlainText()` on load
- `package.json` — add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`

---

### 3.2 Content Versioning / Change History

**Gap**: #3 — Changes overwrite previous version with no undo or history.

**Plan**:
- Create `destination_versions` table:
  ```sql
  CREATE TABLE destination_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    changed_fields TEXT[],
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- Before each update, snapshot current row into `destination_versions`
- Add "History" tab to DestinationForm showing versions with timestamps and changed fields
- Allow viewing historical versions and showing diffs
- "Restore" button that creates a new version entry when reverting

**Files**:
- `supabase/migrations/` — new migration
- `src/features/admin/components/DestinationForm.tsx` — History tab
- `app/api/admin/destinations/versions/route.ts` — new
- `app/admin/destinations/page.tsx` — snapshot before save

---

### 3.3 SEO Management

**Gap**: #11 — No meta title/description fields, no sitemap controls.

**Plan**:
- Add columns: `meta_title`, `meta_description`, `canonical_url`, `noindex` (boolean)
- Add SEO section to DestinationForm (either new tab or within Data tab)
- Include character counts for meta title (60 char target) and meta description (160 char target)
- Auto-generation fallbacks: meta_title → `${name} - ${city} | Urban Manual`, meta_description → `micro_description`
- Update destination detail page metadata generation to use SEO fields
- Add SEO completeness to `getCompletenessScore()` in ContentManager
- Add "Missing SEO" filter in ContentManager

**Files**:
- `supabase/migrations/` — new migration
- `types/destination.ts` — add SEO fields
- `src/features/admin/components/DestinationForm.tsx` — SEO section
- `src/features/admin/components/cms/ContentManager.tsx` — SEO filter, completeness update
- Destination detail page — use SEO fields for metadata

---

## Phase 4: Long-term

### 4.1 Real-time Collaboration / Edit Locking

**Gap**: #10 — No indication of concurrent editing.

**Plan**:
- Use Supabase Realtime presence to track which admin is editing which destination
- Show avatar/badge on ContentManager rows being edited by another admin
- Show warning banner in DestinationForm if another admin is editing the same destination
- Allow optimistic concurrency with conflict resolution modal on stale saves

**Files**:
- `src/features/admin/hooks/usePresence.ts` — new
- `src/features/admin/components/DestinationForm.tsx` — presence indicator
- `src/features/admin/components/cms/ContentManager.tsx` — editing indicators

---

### 4.2 Content Approval Workflow with Roles

**Gap**: #15 — Single `admin` role with no editor/reviewer differentiation.

**Plan**:
- Define roles: `admin` (full), `editor` (create/edit → pending review), `reviewer` (approve/reject)
- Extend `app_metadata.role` to support new values
- When editors save, set status to `pending_review`
- Add "Review Queue" admin page
- Role-based UI: editors see limited nav, reviewers see review queue prominently
- Builds on Phase 2.3 content status workflow

**Files**:
- `src/features/admin/components/AdminLayoutShell.tsx` — role-based access
- `src/features/admin/components/AdminNav.tsx` — role-based navigation
- `app/admin/review/page.tsx` — new
- `app/api/admin/review/route.ts` — new

---

### 4.3 Image Optimization and Cropping

**Gap**: #8 — No crop, resize, or format optimization.

**Plan**:
- Integrate client-side image cropping library (e.g., `react-easy-crop`)
- Standard aspect ratio for destination images (16:9 for cards)
- Server-side processing with `sharp`: resize to standard sizes (400px thumbnail, 800px medium, 1600px large), convert to WebP
- Store optimized URLs in `image_thumbnail` (field already exists on Destination type)

**Files**:
- `src/features/admin/components/DestinationForm.tsx` — crop UI in media tab
- `src/features/admin/components/cms/MediaLibrary.tsx` — crop on upload
- `app/api/admin/optimize-image/route.ts` — new
- `package.json` — add dependencies

---

### 4.4 Notifications and Alerts System

**Gap**: #12 — Settings reference notifications but no delivery mechanism.

**Plan**:
- Create `admin_notifications` table for in-app notifications
- Add notification bell in admin header with unread count
- Supabase Realtime subscription for live notifications
- Email delivery via Resend/SendGrid for configured notification types
- Trigger from key events: new user signup, content report, weekly digest

**Files**:
- `supabase/migrations/` — new migration
- `src/features/admin/components/AdminLayoutShell.tsx` — notification bell
- `src/features/admin/components/NotificationPanel.tsx` — new
- `app/api/admin/notifications/route.ts` — new

---

## Priority Matrix

| # | Item | Phase | Effort | Impact | Priority |
|---|------|-------|--------|--------|----------|
| 1.1 | Persist Settings | 1 | Low | High | **P0** |
| 1.2 | Form Validation | 1 | Low | High | **P0** |
| 1.4 | Dashboard API | 1 | Low | High | **P0** |
| 2.1 | Audit Trail | 2 | Medium | High | **P0** |
| 2.3 | Content Status Workflow | 2 | Medium | High | **P0** |
| 1.3 | Expand Bulk Ops | 1 | Low | Medium | **P1** |
| 2.2 | CSV/JSON Import | 2 | Medium | High | **P1** |
| 3.1 | Rich Text Editor | 3 | Medium | High | **P1** |
| 3.3 | SEO Management | 3 | Medium | High | **P1** |
| 2.4 | Media Folders | 2 | Medium | Medium | **P2** |
| 3.2 | Content Versioning | 3 | High | Medium | **P2** |
| 4.3 | Image Optimization | 4 | High | Medium | **P2** |
| 4.1 | Real-time Collaboration | 4 | High | Medium | **P3** |
| 4.2 | Approval Workflow | 4 | High | Medium | **P3** |
| 4.4 | Notifications System | 4 | High | Low | **P3** |

---

## Key Implementation Notes

1. **`content_audit_log` already exists** — The database table and `get_destination_history()` function are already in place (migration 438). Phase 2.1 just needs to start writing to it.

2. **`image_thumbnail` field already exists** — The Destination type already has this field, so Phase 4.3 can store optimized thumbnails without schema changes.

3. **ContentManager already has robust bulk ops** — Phase 1.3 is about extending, not building from scratch. The patterns for bulk operations are well-established.

4. **Settings page is entirely client-side** — The `handleSave` function at line 108 of settings/page.tsx uses `setTimeout` to simulate a save. This is the easiest quick win.

5. **Phase 2.3 (Content Status) has the widest blast radius** — Adding a `status` column and filtering by it touches every public-facing query. Requires careful rollout to avoid hiding existing destinations.
