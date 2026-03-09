## 2025-11-20 - Untrusted Input in Rate Limiting

**Vulnerability:** The `/api/ai-chat` endpoint trusted the `userId` provided in the request body for rate limiting and data access. This allowed malicious users to bypass rate limits by spoofing `userId` and potentially pollute analytics or attempt data access (though RLS would likely prevent data leakage).
**Learning:** NEVER trust client-provided IDs for security controls like rate limiting or authorization. Always derive identity from the authenticated session (cookies/tokens).
**Prevention:**
1.  **Verify:** Always use `supabase.auth.getUser()` to get the authenticated user ID.
2.  **Use Verified ID:** Pass the verified ID to rate limiters and business logic.
3.  **Fallback Safe:** If unauthenticated, ensure the rate limiter falls back to IP address (pass `undefined` or `null` as user ID).
