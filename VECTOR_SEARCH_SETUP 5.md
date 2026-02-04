# Vector Search Setup Guide

## ✅ Completed

1. **Migrations Created:**
   - `023_enable_vector_search.sql` - Enables pgvector extension and adds embedding columns
   - `024_hybrid_search_function.sql` - Creates hybrid search function with user context
   - `025_conversation_tables.sql` - Conversation tables (if not already exist)
   - `027_embedding_metadata.sql` - Embedding metadata columns + trigger-based invalidation

2. **Utilities Created:**
   - `lib/embeddings/generate.ts` - Embedding generation utility
   - `scripts/backfill-embeddings.ts` - Backfill script for existing destinations

3. **Package Scripts:**
   - Added `backfill-embeddings` script to package.json

## 📋 Next Steps

### 1. Run Migrations in Supabase

Run these migrations in order in your Supabase SQL Editor:

```sql
-- 1. Enable vector search
-- Run: supabase/migrations/023_enable_vector_search.sql

-- 2. Create hybrid search function
-- Run: supabase/migrations/024_hybrid_search_function.sql

-- 3. Embedding metadata + trigger-based invalidation
-- Run: supabase/migrations/027_embedding_metadata.sql

-- 4. Conversation tables (if needed)
-- Run: supabase/migrations/025_conversation_tables.sql
```

### 2. Set Environment Variables

Ensure these are set in your `.env.local` (and production secrets) so the worker can run continuously:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  # Optional, defaults to this
EMBEDDING_VERSION=2024-06-initial              # Bump to force re-embedding
EMBEDDING_WORKER_BATCH_SIZE=50                 # Optional overrides
EMBEDDING_WORKER_RATE_LIMIT_MS=25
EMBEDDING_WORKER_POLL_INTERVAL_MS=15000
```

### 3. Continuous Embedding Worker

`scripts/backfill-embeddings.ts` now doubles as a long-running worker. It polls for destinations where `embedding` is missing or `embedding_needs_update = true`, regenerates embeddings via `generateDestinationEmbedding`, and writes back the vector plus metadata (`embedding_model`, `embedding_version`, `embedding_generated_at`).

- **One-shot mode (drain queue locally):** `npm run backfill-embeddings -- --once`
- **Continuous mode (recommended for staging/prod):** `npm run backfill-embeddings`
- **Production tip:** run it under a process manager (systemd, PM2, Fly Machines, Supabase Edge Function, etc.) so it restarts automatically.

Worker behavior:

- Processes batches (default 50) with the existing 25ms rate limiter
- Respects `embedding_needs_update` so content edits reflow automatically
- Writes `embedding_version` + clears the flag after a successful update
- Polls again every `EMBEDDING_WORKER_POLL_INTERVAL_MS` when the queue is empty

### 4. How embeddings become stale

- New rows default to `embedding_needs_update = true`
- Trigger `mark_destination_embedding_stale` flips the flag when user-facing fields (`name`, `city`, `category`, `content`, `description`, `tags`, `style_tags`, `ambience_tags`, `experience_tags`) change
- Ops can also run manual SQL: `UPDATE destinations SET embedding_needs_update = true WHERE slug = 'example';`

### 5. Force a controlled re-embed

1. Pick a new `EMBEDDING_VERSION` (e.g., `2024-07-gpt4o-mini`) and update env vars wherever the worker runs
2. Mark rows for refresh:

```sql
UPDATE destinations
SET embedding_needs_update = TRUE
WHERE embedding_version IS DISTINCT FROM '2024-07-gpt4o-mini';
```

3. Restart the worker. It will pick up the queue, respect rate limits, and write the new version metadata as it progresses.

### 6. Test Hybrid Search

Test the hybrid search function:

```sql
-- Example: Search for "cozy cafes in Tokyo"
SELECT * FROM search_destinations_hybrid(
  query_embedding := (SELECT embedding FROM destinations WHERE slug = 'sample-destination' LIMIT 1),
  city_filter := 'Tokyo',
  category_filter := 'cafe',
  limit_count := 10
);
```

## 🔧 Integration Points

### Current API Routes

The existing API routes can be enhanced to use vector search:

1. **`/api/ai-chat/route.ts`** - Already uses vector search via `match_destinations` RPC
2. **`/api/search/route.ts`** - Can be enhanced with hybrid search
3. **`/api/conversation/[user_id]/route.ts`** - Can use hybrid search for context-aware results
4. **`lib/search/semanticSearch.ts` & dependent API routes** - Now call the `search_destinations_intelligent` (aligned with `search_destinations_hybrid`) RPC so semantic search results flow through Supabase. The helper maps `city`, `category`, and `open_now` filters directly to the RPC arguments, trusts the RPC’s editorial boosts for ranking, and only falls back to Asimov keyword search if the RPC fails (logging `vector_failure`/`vector_fallback` metrics when it does).

### Hybrid Search Function Features

The `search_destinations_hybrid` function provides:

- **Vector similarity** (50% weight) - Semantic match
- **Rating boost** (15% weight) - Higher rated places
- **Michelin boost** (10% weight) - Awarded places
- **Saved boost** (15% weight) - User's saved places (if `boost_saved = true`)
- **Visited boost** (10% weight) - User's visited places

### Filters Available

- `city_filter` - Filter by city name
- `category_filter` - Filter by category
- `michelin_only` - Only show Michelin-starred
- `price_max` - Maximum price level
- `rating_min` - Minimum rating
- `tags_filter` - Array of tags to match
- `include_saved_only` - Only return saved destinations
- `boost_saved` - Boost saved destinations in ranking

## 📊 Performance Considerations

- **IVFFlat Index**: Uses `lists = 100` for good performance on ~1000 destinations
- **Batch Processing**: Backfill processes 50 destinations at a time
- **Rate Limiting**: 25ms delay between embedding requests to avoid API limits

## 🚨 Notes

- The `embedding` column uses `vector(3072)` type (for text-embedding-3-large)
- Embeddings are generated once and stored - no need to regenerate unless destination content changes
- The hybrid search function requires embeddings to exist (`WHERE d.embedding IS NOT NULL`)

## 🔄 Future Enhancements

1. **Auto-update embeddings** when destination content changes ✅ (trigger + worker in place)
2. **Incremental backfill** for new destinations ✅ (continuous worker)
3. **Embedding versioning** for model upgrades ✅ (`embedding_version` column + env var)
4. **Caching** frequently searched embeddings

