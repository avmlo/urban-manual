## 2025-05-24 - Missing Rate Limiting on Intelligence Routes
**Vulnerability:** `app/api/intelligence/*` routes (like `plan-trip`, `itinerary/generate`) lacked rate limiting despite using expensive LLM resources (Gemini Pro).
**Learning:** New feature branches (like `intelligence`) might bypass standard security middleware if not explicitly checked against security checklists. Features are often built quickly without standardizing on existing protection mechanisms like `enforceRateLimit`.
**Prevention:** Enforce a "Security Checklist" for new API routes including Rate Limiting and Auth checks. Use shared wrappers like `withErrorHandling` but also potentially `withRateLimit` if possible, or use middleware.
