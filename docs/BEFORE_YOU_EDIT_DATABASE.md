# List before editing the database

Run the **read-only** audit to see exactly what would change. No updates are applied by the audit.

```bash
npm run audit:brands
```

(Requires `.env.local` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_*`.)

---

## What the audit reports (read-only)

### 1. EDITION brand fix (would update)

- **Query:** Rows where `brand = 'EDITION'`.
- **Planned change:** `UPDATE destinations SET brand = 'edition' WHERE brand = 'EDITION';`
- **Output:** Count and list of `id, name, city, category` that would be updated.

### 2. All brands with destinations (spot-check)

- **Query:** All rows with `brand IS NOT NULL`, ordered by brand, then city.
- **Output:** For each brand value: count and up to 5 example rows (name, city, category). Lets you spot wrong casing or typos.

### 3. Destinations missing brand but name suggests one

- **Query:** Rows with `brand IS NULL` and `name` containing (case-insensitive):  
  `four seasons`, `aman`, `ritz`, `mandarin`, `rosewood`, `park hyatt`, `edition`, `st regis`, `peninsula`, `fairmont`, `sofitel`, `hyatt`, `marriott`, `belmond`.
- **Output:** List of `id, name, city, category` that you might want to assign a brand.

### 4. brand_id inconsistencies

- **Query:** Only if a `brand_id` column exists. Groups by `brand` and checks if the same brand text has more than one distinct `brand_id`.
- **Output:** Brands that have multiple `brand_id` values (or a note that `brand_id` is not present).

### 5. Stale embeddings

- **Query:** Rows where `embedding_needs_update = true`.
- **Output:** Count and up to 50 rows (`id, name, city`). These are the ones your embedding script would regenerate.

### 6. Missing AI / content summaries

- **Query:** Counts where `ai_short_summary IS NULL` and where `content IS NULL`.
- **Output:** Total destinations, counts missing ai_short_summary and content, and a sample of rows missing ai_short_summary.

### 7. Empty AI columns (populate or drop)

- **Query:** Counts where `ai_keywords IS NULL` and `ai_vibe_tags IS NULL`.
- **Output:** Counts and percentages. These are the columns you said are at 0%—either to backfill or to drop from the schema.

---

## After you review the list

- **EDITION fix:** Run the single UPDATE only if the audit list looks correct.
- **Stale embeddings:** Run your existing embedding script (e.g. `npm run backfill-embeddings` or the API) for the IDs listed.
- **Missing summaries:** Use your AI pipeline (e.g. regenerate-content or generate_ai_fields) for the destinations listed.
- **Empty AI columns:** Decide to either populate (e.g. extend `scripts/generate_ai_fields.py`) or drop the columns via a migration.

No database edits are made by `npm run audit:brands`.
