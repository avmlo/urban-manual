## 2024-05-23 - Public Service Role Endpoints MUST Have Rate Limiting

**Vulnerability:** The `/api/intelligence/suggest-next` endpoint uses `createServiceRoleClient` (bypassing RLS) but lacked any rate limiting or authentication checks. This allowed unauthenticated users to trigger unlimited database queries with admin privileges.
**Learning:** Endpoints that bypass RLS (even for benign features like "suggest next") are effectively open pipes to your database resources. They must be treated as critical security boundaries.
**Prevention:**
1.  **Identify:** Scan for `createServiceRoleClient` usage in `app/api/`.
2.  **Verify:** Check if the endpoint handles `request.auth` or similar.
3.  **Protect:** If public, MANDATORY `enforceRateLimit` (IP-based). If private, MANDATORY auth check + user-based rate limit.

## 2025-02-23 - Protect Geolocation Fallbacks

**Vulnerability:** The `/api/nearby` endpoint falls back to expensive client-side distance calculations when the database function is unavailable. This, combined with a lack of rate limiting, could allow attackers to exhaust server resources (CPU/Memory) by spamming requests with large `limit` or `radius` parameters.
**Learning:** Public endpoints that include "heavy" fallback logic (like in-memory filtering of large datasets) are prime targets for DoS attacks, even if the primary path is optimized.
**Prevention:**
1. Always rate limit public endpoints, especially those involving search or heavy computation.
2. When implementing fallbacks for DB functions, ensure they are also performant or strictly bounded (e.g., lower limits for fallback mode).
