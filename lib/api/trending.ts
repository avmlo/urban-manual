import { TrendingDestination } from '@/lib/ml/forecasting';

// Module-level cache for request deduplication
interface TrendingCache {
  data: { trending: TrendingDestination[] } | null;
  timestamp: number;
  promise: Promise<{ trending: TrendingDestination[] }> | null;
}

// Exported for testing purposes - reset cache helper
export const _trendingCache: TrendingCache = {
  data: null,
  timestamp: 0,
  promise: null
};

const CACHE_TTL = 60000; // 60 seconds

// Exported for testing and usage
export async function fetchTrendingData(): Promise<{ trending: TrendingDestination[] } | null> {
  const now = Date.now();

  // Return cached data if valid
  if (_trendingCache.data && (now - _trendingCache.timestamp < CACHE_TTL)) {
    return _trendingCache.data;
  }

  // Return existing promise if request is in flight
  if (_trendingCache.promise) {
    return _trendingCache.promise;
  }

  // Initiate new request
  _trendingCache.promise = fetch(
    `/api/ml/forecast/trending?top_n=100&forecast_days=7`,
    { signal: AbortSignal.timeout(3000) }
  ).then(async (res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch trending data');
    }
    const data = await res.json();
    _trendingCache.data = data;
    _trendingCache.timestamp = Date.now();
    return data;
  }).catch((err) => {
    // Keep stale data if available? No, let's just fail this request.
    // But we must clear the promise so retries can happen.
    throw err;
  }).finally(() => {
    _trendingCache.promise = null;
  });

  return _trendingCache.promise;
}
