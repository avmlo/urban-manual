## 2024-05-23 - Public Service Role Endpoints MUST Have Rate Limiting

**Vulnerability:** The `/api/intelligence/suggest-next` endpoint uses `createServiceRoleClient` (bypassing RLS) but lacked any rate limiting or authentication checks. This allowed unauthenticated users to trigger unlimited database queries with admin privileges.
**Learning:** Endpoints that bypass RLS (even for benign features like "suggest next") are effectively open pipes to your database resources. They must be treated as critical security boundaries.
**Prevention:**
1.  **Identify:** Scan for `createServiceRoleClient` usage in `app/api/`.
2.  **Verify:** Check if the endpoint handles `request.auth` or similar.
3.  **Protect:** If public, MANDATORY `enforceRateLimit` (IP-based). If private, MANDATORY auth check + user-based rate limit.

## 2025-05-23 - Supabase Key Fallback Bypasses RLS
**Vulnerability:** Multiple endpoints (e.g., `app/api/cities/route.ts`) used `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` to initialize the Supabase client. This pattern unintentionally grants admin privileges (bypassing Row Level Security) in any environment where the service role key is present (e.g., production), exposing data that should be protected.
**Learning:** Fallback logic for security credentials often defaults to the *most* privileged key available, violating the principle of least privilege.
**Prevention:** Explicitly use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for all client-facing or public data fetching operations. Never use the service role key as a fallback for the anon key.
