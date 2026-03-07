## 2024-05-23 - Public Service Role Endpoints MUST Have Rate Limiting

**Vulnerability:** The `/api/intelligence/suggest-next` endpoint uses `createServiceRoleClient` (bypassing RLS) but lacked any rate limiting or authentication checks. This allowed unauthenticated users to trigger unlimited database queries with admin privileges.
**Learning:** Endpoints that bypass RLS (even for benign features like "suggest next") are effectively open pipes to your database resources. They must be treated as critical security boundaries.
**Prevention:**
1.  **Identify:** Scan for `createServiceRoleClient` usage in `app/api/`.
2.  **Verify:** Check if the endpoint handles `request.auth` or similar.
3.  **Protect:** If public, MANDATORY `enforceRateLimit` (IP-based). If private, MANDATORY auth check + user-based rate limit.

## 2025-05-27 - Insecure File Upload Validation

**Vulnerability:** `app/api/upload-trip-cover/route.ts` validated file uploads using `file.type.startsWith('image/')`. This is insecure because `file.type` is trusted client input and can be trivially spoofed by an attacker to upload malicious scripts with allowed extensions.
**Learning:** Never trust client-provided MIME types or filenames for security validation.
**Prevention:** Always use content inspection (magic bytes) to validate file types using `validateImageFile`. Generate safe filenames/extensions based on the *detected* content type, not the user-provided filename.
