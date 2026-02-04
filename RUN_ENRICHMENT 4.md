# Quick Start: Run Enrichment for Cuisine Type

## Option 1: Using npm (Recommended)

Open your terminal and run:

```bash
cd /Users/alxrhg/urban-manual

# Test with 10 destinations
npm run enrich -- --limit 10

# Or enrich all unenriched destinations
npm run enrich

# Or re-enrich ALL to add cuisine_type
npm run enrich -- --all
```

## Option 2: Using the shell script

```bash
cd /Users/alxrhg/urban-manual
bash scripts/run-enrichment.sh
```

## Option 3: Using tsx directly

```bash
cd /Users/alxrhg/urban-manual
npx tsx scripts/enrich-destinations.ts --limit 10
```

## What You'll See

The script will:
1. Fetch destinations from Supabase
2. Call Google Places API for each destination
3. Extract `cuisine_type` from Google Places types
4. Update the database with cuisine_type and other enrichment data
5. Display progress and results

## Expected Output

```
🚀 Starting destination enrichment...

📊 Found 10 destinations to enrich

[1/10] Enriching: Restaurant Name (City)
  ✅ Success!
     Rating: 4.5
     Price: $$$
     Category: Dining
     Cuisine Type: Italian
     Tags: fine-dining, romantic, michelin-starred

...

📈 Enrichment Summary:
   ✅ Success: 10
   ❌ Errors: 0
   📊 Total: 10
```

## Verify Results

After running, check your database:

```sql
SELECT slug, name, cuisine_type, city, last_enriched_at
FROM destinations
WHERE cuisine_type IS NOT NULL
ORDER BY last_enriched_at DESC
LIMIT 20;
```

## Troubleshooting

If you get errors:
1. Make sure `.env.local` has all required API keys
2. Check that Supabase credentials are correct
3. Verify Google Places API is enabled and has quota
4. Check that migration `408_add_cuisine_type.sql` was run

