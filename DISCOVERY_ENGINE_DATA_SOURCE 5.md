# Discovery Engine Data Source

## Data Flow Overview

The Discovery Engine data store gets its data from **Supabase** (your PostgreSQL database).

```
┌─────────────┐
│  Supabase   │  (Source of Truth)
│ destinations│
│    table    │
└──────┬──────┘
       │
       │ Export Script
       │ (npm run discovery:export)
       ▼
┌─────────────┐
│   JSON File │  (discovery-engine-export.json)
│  (temporary)│
└──────┬──────┘
       │
       │ Import Script
       │ (npm run discovery:import)
       ▼
┌─────────────────────┐
│ Discovery Engine    │  (Google Cloud)
│    Data Store       │
└─────────────────────┘
```

---

## Source: Supabase `destinations` Table

The data comes from your **Supabase database**, specifically the `destinations` table.

### What Data is Exported?

The export script (`scripts/discovery-engine-export.ts`) fetches all destinations from Supabase and includes:

**Core Fields:**
- `id` / `slug` - Unique identifier
- `name` - Destination name
- `description` - Description text
- `city` - City name
- `category` - Category (dining, culture, etc.)
- `tags` - Array of tags

**Enrichment Fields:**
- `rating` - Rating (0-5)
- `price_level` - Price level (1-4)
- `michelin_stars` - Michelin stars
- `cuisine_type` - Cuisine type
- `editorial_note` - Editorial notes

**Location Fields:**
- `latitude` / `longitude` - Coordinates
- `images` - Array of image URLs

**Engagement Fields:**
- `trending_score` - Trending score
- `views_count` - View count
- `saves_count` - Save count
- `visits_count` - Visit count

**Metadata:**
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

---

## Export Process

### Step 1: Export from Supabase

```bash
npm run discovery:export
```

**What it does:**
1. Connects to Supabase using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Fetches ALL destinations from the `destinations` table:
   ```typescript
   const { data: destinations } = await supabase
     .from('destinations')
     .select('*')
     .order('id', { ascending: true });
   ```
3. Transforms each destination to Discovery Engine format
4. Saves to `discovery-engine-export.json` file

**Output:** `discovery-engine-export.json` (JSON file with all destinations)

---

## Import Process

### Step 2: Import to Discovery Engine

```bash
npm run discovery:import
```

**What it does:**
1. Reads `discovery-engine-export.json`
2. Transforms destinations to Discovery Engine document format
3. Imports in batches (100 at a time) to Google Discovery Engine
4. Uses the `importDocuments()` method which calls Google Cloud API

**Result:** All destinations are now searchable in Discovery Engine

---

## Data Transformation

### Supabase Format → Discovery Engine Format

**Supabase (source):**
```json
{
  "id": 123,
  "slug": "restaurant-name",
  "name": "Restaurant Name",
  "description": "A great restaurant...",
  "city": "paris",
  "category": "dining",
  "rating": 4.5,
  "tags": ["romantic", "fine-dining"]
}
```

**Discovery Engine (target):**
```json
{
  "id": "restaurant-name",
  "name": "Restaurant Name",
  "content": "Restaurant Name. A great restaurant... Located in paris. Category: dining. Tags: romantic, fine-dining",
  "structData": {
    "slug": "restaurant-name",
    "name": "Restaurant Name",
    "description": "A great restaurant...",
    "city": "paris",
    "category": "dining",
    "tags": ["romantic", "fine-dining"],
    "rating": 4.5,
    "price_level": 3,
    "michelin_stars": 1,
    "coordinates": {
      "latitude": 48.8566,
      "longitude": 2.3522
    },
    "metadata": {
      "trending_score": 0.85,
      "views_count": 1234,
      "saves_count": 56,
      "visits_count": 12
    }
  },
  "uri": "/destination/restaurant-name"
}
```

**Key transformations:**
- `id` becomes the `slug` (or `id.toString()`)
- `content` field is built from name, description, city, category, tags (for semantic search)
- `structData` contains structured fields (for filtering and boosting)
- `uri` is the destination URL path

---

## Keeping Data in Sync

### Current Approach: Manual Sync

Currently, you need to manually export and import when data changes:

1. **When to sync:**
   - After adding new destinations
   - After updating destination data (name, description, etc.)
   - After significant data changes
   - Periodically (e.g., weekly) to catch all updates

2. **How to sync:**
   ```bash
   # Export latest data from Supabase
   npm run discovery:export
   
   # Import to Discovery Engine
   npm run discovery:import
   ```

### Future: Automated Sync (Recommended)

You could set up automated syncing:

**Option 1: Database Triggers**
- Set up Supabase webhooks on `destinations` table changes
- Automatically export/import when data changes

**Option 2: Scheduled Jobs**
- Run export/import daily via cron job
- Use Vercel Cron Jobs or similar

**Option 3: Real-time Sync**
- Listen to Supabase real-time subscriptions
- Sync individual destinations as they change

---

## Data Source Summary

| Aspect | Details |
|--------|---------|
| **Source** | Supabase PostgreSQL database |
| **Table** | `destinations` |
| **Export Method** | `scripts/discovery-engine-export.ts` |
| **Import Method** | `scripts/discovery-engine-import.ts` |
| **Format** | JSON (temporary) → Discovery Engine documents |
| **Sync Frequency** | Manual (can be automated) |
| **Batch Size** | 100 destinations per batch |

---

## Environment Variables Needed

For export:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For import:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## FAQ

### Q: Can I use a different data source?

**A:** Yes! You can modify `scripts/discovery-engine-export.ts` to fetch from:
- A different database
- An API endpoint
- A CSV file
- Any other data source

Just ensure the data format matches what `transformToDocument()` expects.

### Q: What if I add a new destination to Supabase?

**A:** You need to re-export and re-import:
```bash
npm run discovery:export
npm run discovery:import
```

The import uses `reconciliationMode: 'INCREMENTAL'`, so it will:
- Update existing destinations (by ID/slug)
- Add new destinations
- Keep existing ones that aren't in the export

### Q: Can I sync only changed destinations?

**A:** Currently, the export fetches all destinations. You could modify it to:
- Only export destinations where `updated_at > last_sync_date`
- Use Supabase real-time to sync individual changes
- Track a `last_synced_to_discovery` timestamp

### Q: What happens if I delete a destination in Supabase?

**A:** The destination will remain in Discovery Engine until you:
1. Export again (it won't be in the export)
2. Manually delete it from Discovery Engine
3. Or set up deletion sync logic

---

## Next Steps

1. ✅ **Initial Import**: Run export/import once to populate Discovery Engine
2. ✅ **Regular Syncs**: Set up a schedule (daily/weekly) to keep data fresh
3. ✅ **Automation**: Consider automated syncing for real-time updates
4. ✅ **Monitoring**: Track sync status and handle errors

For setup instructions, see:
- `EXISTING_GOOGLE_CLOUD_SETUP.md` - Setting up Google Cloud
- `DISCOVERY_ENGINE_SETUP.md` - Complete setup guide

