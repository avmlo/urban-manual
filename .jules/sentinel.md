## 2025-05-20 - Missing Rate Limiting on Agentic Endpoints

**Vulnerability:** Expensive AI endpoints (specifically trip planning tools) were unprotected by rate limits, allowing potential Denial of Service (DoS) and significant cost spikes due to LLM usage.

**Learning:** New features, especially those involving "Agentic" workflows or complex AI interactions, are often added without the standard infrastructure protections (like rate limiting) that are applied to older, simpler endpoints. The complexity of the feature can distract from basic security hygiene.

**Prevention:**
1.  Establish a pattern where *all* new routes under `/api/intelligence/` or `/api/ai/` must include a rate limit check at the very top.
2.  Consider a middleware or higher-order function (like `withRateLimit`) to enforce this declaratively rather than relying on manual insertion in every route handler.
