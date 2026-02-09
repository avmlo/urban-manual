/**
 * Observability Metrics Collection
 *
 * Lightweight in-process metrics for API latency, error rates, cache hits,
 * and provider health. Designed for export to Sentry/Vercel Analytics or
 * a future metrics backend.
 *
 * All data is stored in memory with rolling windows and periodic flushing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LatencySample {
  timestamp: number;
  durationMs: number;
  isError: boolean;
}

interface EndpointMetrics {
  /** Rolling window of latency samples (last 10 minutes) */
  samples: LatencySample[];
  /** Total requests since process start */
  totalRequests: number;
  /** Total errors since process start */
  totalErrors: number;
  /** Total rate-limit rejections */
  totalRateLimited: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
}

interface ProviderHealthMetrics {
  requests: number;
  failures: number;
  circuitBreaks: number;
  lastLatencyMs: number | null;
  lastErrorAt: number | null;
}

interface SLODefinition {
  /** Human-readable name */
  name: string;
  /** Target P95 latency in ms */
  targetP95Ms: number;
  /** Target availability (0-1) */
  targetAvailability: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const WINDOW_MS = 10 * 60 * 1000; // 10-minute rolling window
const endpointMetrics = new Map<string, EndpointMetrics>();
const cacheMetrics: Record<string, CacheMetrics> = {};
const providerMetrics: Record<string, ProviderHealthMetrics> = {};

/**
 * Predefined SLOs for critical endpoints.
 * Add new endpoints here when they are considered critical-path.
 */
export const SLO_DEFINITIONS: Record<string, SLODefinition> = {
  "/api/ai-chat": {
    name: "AI Chat",
    targetP95Ms: 5000,
    targetAvailability: 0.995,
  },
  "/api/discovery/search/natural-language": {
    name: "Discovery Search",
    targetP95Ms: 3000,
    targetAvailability: 0.998,
  },
  "/api/contextual-search": {
    name: "Contextual Search",
    targetP95Ms: 4000,
    targetAvailability: 0.997,
  },
  "/api/intelligence/plan-trip": {
    name: "Trip Planning",
    targetP95Ms: 8000,
    targetAvailability: 0.99,
  },
  "/api/smart-chat": {
    name: "Smart Chat",
    targetP95Ms: 6000,
    targetAvailability: 0.995,
  },
  "/api/google-places-search": {
    name: "Google Places Proxy",
    targetP95Ms: 2000,
    targetAvailability: 0.998,
  },
  "/api/weather": {
    name: "Weather",
    targetP95Ms: 2000,
    targetAvailability: 0.99,
  },
};

// ---------------------------------------------------------------------------
// Collection API
// ---------------------------------------------------------------------------

function getOrCreateEndpoint(route: string): EndpointMetrics {
  let metrics = endpointMetrics.get(route);
  if (!metrics) {
    metrics = {
      samples: [],
      totalRequests: 0,
      totalErrors: 0,
      totalRateLimited: 0,
    };
    endpointMetrics.set(route, metrics);
  }
  return metrics;
}

function pruneOldSamples(metrics: EndpointMetrics): void {
  const cutoff = Date.now() - WINDOW_MS;
  // Remove samples older than the window
  while (metrics.samples.length > 0 && metrics.samples[0].timestamp < cutoff) {
    metrics.samples.shift();
  }
}

/**
 * Record a completed API call.
 * Called automatically by withStandardApi but can also be called manually.
 */
export function recordApiCall(
  route: string,
  statusCode: number,
  durationMs: number,
  isError = false
): void {
  const metrics = getOrCreateEndpoint(route);
  metrics.totalRequests++;
  if (isError || statusCode >= 500) {
    metrics.totalErrors++;
  }
  if (statusCode === 429) {
    metrics.totalRateLimited++;
  }
  metrics.samples.push({
    timestamp: Date.now(),
    durationMs,
    isError: isError || statusCode >= 500,
  });

  // Opportunistic pruning (every 100 requests)
  if (metrics.totalRequests % 100 === 0) {
    pruneOldSamples(metrics);
  }
}

/**
 * Record a cache hit or miss for a named cache.
 */
export function recordCacheEvent(cacheName: string, hit: boolean): void {
  if (!cacheMetrics[cacheName]) {
    cacheMetrics[cacheName] = { hits: 0, misses: 0 };
  }
  if (hit) {
    cacheMetrics[cacheName].hits++;
  } else {
    cacheMetrics[cacheName].misses++;
  }
}

/**
 * Record an AI provider event for health tracking.
 */
export function recordProviderEvent(
  providerName: string,
  opts: { success: boolean; latencyMs?: number; circuitBreak?: boolean }
): void {
  if (!providerMetrics[providerName]) {
    providerMetrics[providerName] = {
      requests: 0,
      failures: 0,
      circuitBreaks: 0,
      lastLatencyMs: null,
      lastErrorAt: null,
    };
  }
  const m = providerMetrics[providerName];
  m.requests++;
  if (!opts.success) {
    m.failures++;
    m.lastErrorAt = Date.now();
  }
  if (opts.circuitBreak) {
    m.circuitBreaks++;
  }
  if (opts.latencyMs !== undefined) {
    m.lastLatencyMs = opts.latencyMs;
  }
}

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
}

/**
 * Get latency percentiles for a route within the rolling window.
 */
export function getLatencyPercentiles(route: string): {
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
} {
  const metrics = endpointMetrics.get(route);
  if (!metrics || metrics.samples.length === 0) {
    return { p50: 0, p95: 0, p99: 0, sampleCount: 0 };
  }

  pruneOldSamples(metrics);

  const durations = metrics.samples
    .map((s) => s.durationMs)
    .sort((a, b) => a - b);

  return {
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    sampleCount: durations.length,
  };
}

/**
 * Get availability (success rate) for a route within the rolling window.
 */
export function getAvailability(route: string): number {
  const metrics = endpointMetrics.get(route);
  if (!metrics || metrics.samples.length === 0) return 1;

  pruneOldSamples(metrics);

  const total = metrics.samples.length;
  const errors = metrics.samples.filter((s) => s.isError).length;
  return total > 0 ? (total - errors) / total : 1;
}

/**
 * Check whether an endpoint is meeting its SLO.
 */
export function checkSLO(route: string): {
  route: string;
  slo: SLODefinition | null;
  current: {
    p95Ms: number;
    availability: number;
  };
  meeting: {
    latency: boolean;
    availability: boolean;
    overall: boolean;
  };
} {
  const slo = SLO_DEFINITIONS[route] ?? null;
  const { p95 } = getLatencyPercentiles(route);
  const availability = getAvailability(route);

  const latencyOk = slo ? p95 <= slo.targetP95Ms : true;
  const availabilityOk = slo ? availability >= slo.targetAvailability : true;

  return {
    route,
    slo,
    current: { p95Ms: p95, availability },
    meeting: {
      latency: latencyOk,
      availability: availabilityOk,
      overall: latencyOk && availabilityOk,
    },
  };
}

/**
 * Return a full snapshot of all tracked metrics.
 * Used by the /api/observability/status endpoint.
 */
export function getMetricsSnapshot(): {
  endpoints: Record<
    string,
    {
      totalRequests: number;
      totalErrors: number;
      totalRateLimited: number;
      latency: { p50: number; p95: number; p99: number };
      availability: number;
      sloStatus: ReturnType<typeof checkSLO> | null;
    }
  >;
  caches: Record<string, CacheMetrics & { hitRate: number }>;
  providers: Record<string, ProviderHealthMetrics & { failureRate: number }>;
} {
  const endpoints: Record<string, any> = {};

  for (const [route, metrics] of endpointMetrics.entries()) {
    pruneOldSamples(metrics);
    const latency = getLatencyPercentiles(route);
    const availability = getAvailability(route);
    const sloStatus = SLO_DEFINITIONS[route] ? checkSLO(route) : null;

    endpoints[route] = {
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      totalRateLimited: metrics.totalRateLimited,
      latency: { p50: latency.p50, p95: latency.p95, p99: latency.p99 },
      availability,
      sloStatus,
    };
  }

  const caches: Record<string, CacheMetrics & { hitRate: number }> = {};
  for (const [name, m] of Object.entries(cacheMetrics)) {
    const total = m.hits + m.misses;
    caches[name] = { ...m, hitRate: total > 0 ? m.hits / total : 0 };
  }

  const providers: Record<
    string,
    ProviderHealthMetrics & { failureRate: number }
  > = {};
  for (const [name, m] of Object.entries(providerMetrics)) {
    providers[name] = {
      ...m,
      failureRate: m.requests > 0 ? m.failures / m.requests : 0,
    };
  }

  return { endpoints, caches, providers };
}
