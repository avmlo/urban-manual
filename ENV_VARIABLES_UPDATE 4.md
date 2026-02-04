# Environment Variables Update Summary

## Updated Variable Names

The codebase now prefers these simplified environment variable names:

### Server-Side (API Routes, Scripts)
- `GOOGLE_API_KEY` (instead of `NEXT_PUBLIC_GOOGLE_API_KEY`)
- `SUPABASE_URL` (instead of `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

### Client-Side (Browser)
- `NEXT_PUBLIC_SUPABASE_URL` (still needed for client-side)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (still needed for client-side)

## Files Updated

1. ✅ `lib/enrichment.ts` - Now prefers `GOOGLE_API_KEY`
2. ✅ `scripts/backfill-embeddings.ts` - Now prefers `SUPABASE_URL`
3. ✅ `scripts/test-google-places.ts` - Already had correct order

## Your .env.local Should Include:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# For client-side (browser) - if needed
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google Places API
GOOGLE_API_KEY=your-google-api-key-here

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Fallback Behavior

All code includes fallback logic:
- `process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY`
- `process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL`

So both naming conventions will work, but the simplified names are preferred.

## Testing

Run the Google Places API test:
```bash
npm run test:google-places
```

This will verify your `GOOGLE_API_KEY` is working correctly.

