'use client';

import { useEffect, useState } from 'react';
import { getTrendingBadge, formatBestTimeText, type PeakTimeRecommendation, type TrendingDestination } from '@/lib/ml/forecasting';

interface DestinationBadgesProps {
  destinationId: number;
  compact?: boolean;
  showTiming?: boolean;
}

interface TrendingCache {
  promise: Promise<TrendingResponse> | null;
  data: TrendingResponse | null;
  timestamp: number;
}

interface TrendingResponse {
  trending: TrendingDestination[];
}

// Module-level cache to deduplicate simultaneous requests
// Expires after 60 seconds
const trendingCache: TrendingCache = {
  promise: null,
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60 * 1000;

export function DestinationBadges({ destinationId, compact = false, showTiming = true }: DestinationBadgesProps) {
  const [trendingData, setTrendingData] = useState<TrendingDestination | null>(null);
  const [peakTimes, setPeakTimes] = useState<PeakTimeRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Fetch trending status with deduplication
        let trendingDataResponse: TrendingResponse | null = null;
        const now = Date.now();

        // Use cached data if fresh
        if (trendingCache.data && (now - trendingCache.timestamp < CACHE_DURATION)) {
          trendingDataResponse = trendingCache.data;
        } else if (trendingCache.promise) {
          // Use existing promise if pending
          trendingDataResponse = await trendingCache.promise;
        } else {
          // Create new request
          // Note: AbortSignal.timeout creates a signal that aborts after the timeout.
          // Since we share the promise, if the first request times out, all waiters fail.
          // This is acceptable behavior.
          trendingCache.promise = fetch(
            `/api/ml/forecast/trending?top_n=100&forecast_days=7`,
            { signal: AbortSignal.timeout(5000) } // Increased to 5s to be safer for shared request
          )
            .then(async (res) => {
              if (!res.ok) throw new Error('Failed to fetch trending data');
              const data = await res.json();
              trendingCache.data = data;
              trendingCache.timestamp = Date.now();
              return data;
            })
            .finally(() => {
              // Clear promise reference so next call uses cached data or fetches new
              trendingCache.promise = null;
            });

          trendingDataResponse = await trendingCache.promise;
        }

        if (mounted && trendingDataResponse?.trending) {
          const found = trendingDataResponse.trending.find((t: TrendingDestination) => t.destination_id === destinationId);
          if (found) {
            setTrendingData(found);
          }
        }

        // Fetch peak times if showing timing
        // Peak times are per-destination, so we don't cache globally here
        // (Could be optimized further, but showTiming is false for cards)
        if (showTiming && mounted) {
          const peakRes = await fetch(
            `/api/ml/forecast/peak-times?destination_id=${destinationId}&forecast_days=7`,
            { signal: AbortSignal.timeout(3000) }
          );

          if (peakRes.ok) {
            const data = await peakRes.json();
            // Handle the actual API response format (peak_date, low_date, recommendation)
            if (data.low_date && data.peak_date) {
              const lowDate = new Date(data.low_date);
              const peakDate = new Date(data.peak_date);
              
              const formatDate = (date: Date) => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const day = days[date.getDay()];
                const month = date.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = date.getDate();
                return { day, dateStr: `${month} ${dayNum}` };
              };

              const low = formatDate(lowDate);
              const peak = formatDate(peakDate);

              if (mounted) {
                setPeakTimes({
                  best_times: [{
                    day: low.day,
                    timeRange: low.dateStr,
                  }],
                  worst_times: [{
                    day: peak.day,
                    timeRange: peak.dateStr,
                  }],
                });
              }
            }
          }
        }
      } catch (_error) {
        // Silently fail - badges are optional enhancements
        if (process.env.NODE_ENV === 'development') {
          console.debug('ML forecasting unavailable for destination', destinationId);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [destinationId, showTiming]);

  if (loading) return null;

  const trendingBadge = trendingData ? getTrendingBadge(trendingData.trend_direction) : null;
  if (!trendingBadge && !peakTimes) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {trendingBadge && (
          <div className={`text-xs ${trendingBadge.color} flex items-center gap-1`}>
            <span>{trendingBadge.emoji}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {trendingBadge && (
          <div className="px-3 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-800">
            <span className={`text-xs font-medium ${trendingBadge.color} flex items-center gap-1.5`}>
              <span>{trendingBadge.emoji}</span>
              <span>{trendingBadge.text}</span>
            </span>
          </div>
        )}
      </div>
      {peakTimes && peakTimes.best_times.length > 0 && showTiming && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {formatBestTimeText(peakTimes)}
        </div>
      )}
    </div>
  );
}
