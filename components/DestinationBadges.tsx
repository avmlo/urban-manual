'use client';

import { useEffect, useState } from 'react';
import { getTrendingBadge, formatBestTimeText, type PeakTimeRecommendation, type TrendingDestination } from '@/lib/ml/forecasting';
import { fetchTrendingData } from '@/lib/api/trending';

interface DestinationBadgesProps {
  destinationId: number;
  compact?: boolean;
  showTiming?: boolean;
}

export function DestinationBadges({ destinationId, compact = false, showTiming = true }: DestinationBadgesProps) {
  const [trendingData, setTrendingData] = useState<TrendingDestination | null>(null);
  const [peakTimes, setPeakTimes] = useState<PeakTimeRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch trending status using the cached/deduplicated function
        try {
          const data = await fetchTrendingData();
          if (data && data.trending) {
            const found = data.trending.find((t: TrendingDestination) => t.destination_id === destinationId);
            if (found) {
              setTrendingData(found);
            }
          }
        } catch {
          // Ignore trending fetch errors
          if (process.env.NODE_ENV === 'development') {
             // console.debug('Trending fetch failed');
          }
        }

        // Fetch peak times if showing timing
        if (showTiming) {
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
      } catch {
        // Silently fail - badges are optional enhancements
        if (process.env.NODE_ENV === 'development') {
          console.debug('ML forecasting unavailable for destination', destinationId);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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
