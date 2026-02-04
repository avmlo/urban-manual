# Migration 026 - Quick Run Guide

## ⚠️ IMPORTANT: Run Migration First

The migration **MUST** be run manually in Supabase SQL Editor before running enrichment.

## Quick Steps:

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql
   - Or navigate: Supabase Dashboard → SQL Editor → New Query

2. **Copy Migration SQL:**
   ```bash
   cat supabase/migrations/026_add_advanced_enrichment_fields.sql
   ```

3. **Paste & Run:**
   - Paste the SQL into the editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait for "Success" message

4. **Verify:**
   - Check that columns were added in Table Editor
   - Look for: `photos_json`, `current_weather_json`, `nearby_events_json`, etc.

## After Migration:

Run enrichment:
```bash
npm run enrich:comprehensive [limit] [offset]
```

Example:
```bash
npm run enrich:comprehensive 10  # Test with 10 destinations
npm run enrich:comprehensive    # Run for all destinations
```

