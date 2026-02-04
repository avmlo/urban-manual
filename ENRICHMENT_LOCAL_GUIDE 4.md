# Running Enrichment Locally to Add cuisine_type

## Quick Start

The enrichment script has been updated to include `cuisine_type` extraction from Google Places API. Here's how to run it:

### Option 1: Using npm script (recommended)

```bash
# Enrich all unenriched destinations
npm run enrich

# Re-enrich ALL destinations (including already enriched ones)
npm run enrich -- --all

# Enrich only first 10 destinations
npm run enrich -- --limit 10

# Enrich first 20 destinations
npm run enrich -- --limit 20
```

### Option 2: Using tsx directly

```bash
# Enrich all unenriched destinations
tsx scripts/enrich-destinations.ts

# Re-enrich ALL destinations
tsx scripts/enrich-destinations.ts -- --all

# Enrich only first 10 destinations
tsx scripts/enrich-destinations.ts -- --limit 10
```

## Prerequisites

1. **Environment Variables** (in `.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_API_KEY=your_google_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

2. **Database Migration**: Make sure migration `408_add_cuisine_type.sql` has been applied:
   ```bash
   psql $DATABASE_URL -f supabase/migrations/408_add_cuisine_type.sql
   ```

## What the Script Does

1. Fetches destinations from Supabase (unenriched by default, or all if `--all` flag is used)
2. For each destination:
   - Calls Google Places API to get place details
   - Extracts `cuisine_type` from the `types` array (e.g., "italian_restaurant" → "Italian")
   - Generates AI tags using Gemini
   - Updates the database with all enrichment data including `cuisine_type`

## Output Example

```
🚀 Starting destination enrichment...

📊 Found 5 destinations to enrich

[1/5] Enriching: Restaurant Name (City)
  ✅ Success!
     Rating: 4.5
     Price: $$$
     Category: Dining
     Cuisine Type: Italian
     Tags: fine-dining, romantic, michelin-starred

[2/5] Enriching: Another Restaurant (City)
  ✅ Success!
     Rating: 4.2
     Price: $$
     Category: Dining
     Cuisine Type: Japanese
     Tags: sushi, authentic, popular

...

📈 Enrichment Summary:
   ✅ Success: 5
   ❌ Errors: 0
   📊 Total: 5

💰 Estimated API Cost: $0.09
   Places API: $0.09
   Gemini: $0.0001
```

## Rate Limiting

The script includes a 100ms delay between requests to avoid rate limiting. For large batches, you may want to increase this delay.

## Cost Estimation

- **Google Places API**: ~$0.017 per Text Search request
- **Gemini API**: ~$0.00001 per request
- **Total**: ~$0.017 per destination

## Troubleshooting

### Error: Missing Supabase credentials
Make sure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: Missing Google API key
Make sure `.env.local` has `GOOGLE_API_KEY` or `NEXT_PUBLIC_GOOGLE_API_KEY`

### Error: cuisine_type column doesn't exist
Run the migration:
```bash
psql $DATABASE_URL -f supabase/migrations/408_add_cuisine_type.sql
```

### No destinations found
If using `npm run enrich` (without `--all`), it only enriches destinations where `last_enriched_at IS NULL`. Use `--all` to re-enrich all destinations.

## Verifying Results

After running enrichment, check the database:

```sql
SELECT slug, name, cuisine_type, last_enriched_at 
FROM destinations 
WHERE cuisine_type IS NOT NULL 
ORDER BY last_enriched_at DESC 
LIMIT 10;
```

This will show destinations with `cuisine_type` populated.

