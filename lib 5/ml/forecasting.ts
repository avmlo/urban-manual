/**
 * ML Forecasting Utilities
 * Interfaces with the ML service for demand forecasting, peak times, and trending analysis
 */

export interface PeakTime {
  day_of_week: string;
  hour: number;
  predicted_visits: number;
  confidence: number;
}

export interface PeakTimeRecommendation {
  best_times: Array<{
    day: string;
    timeRange: string;
  }>;
  worst_times: Array<{
    day: string;
    timeRange: string;
  }>;
}

export interface TrendingDestination {
  destination_id: number;
  growth_rate: number;
  current_demand: number;
  predicted_demand: number;
  trend_direction: 'rising' | 'stable' | 'falling';
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Get peak times recommendation for a destination
 */
export async function getPeakTimesForDestination(
  destinationId: number
): Promise<PeakTimeRecommendation | null> {
  try {
    const response = await fetch(
      `/api/ml/forecast/peak-times?destination_id=${destinationId}&forecast_days=7`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      console.warn(`Peak times unavailable for destination ${destinationId}`);
      return null;
    }

    const data = await response.json();

    // Process peak times into recommendations
    if (!data.peak_times || data.peak_times.length === 0) {
      return null;
    }

    // Group by day and find best/worst times
    const peakByDay = data.peak_times.reduce((acc: any, pt: PeakTime) => {
      if (!acc[pt.day_of_week]) {
        acc[pt.day_of_week] = [];
      }
      acc[pt.day_of_week].push(pt);
      return acc;
    }, {});

    // Find the quietest times (lowest predicted visits)
    const allTimes = data.peak_times.sort((a: PeakTime, b: PeakTime) =>
      a.predicted_visits - b.predicted_visits
    );

  const bestTimes = allTimes.slice(0, 3).map((pt: PeakTime) => ({
    day: pt.day_of_week,
    timeRange: formatTimeRange(pt.hour),
  }));

  const worstTimes = allTimes.slice(-3).map((pt: PeakTime) => ({
    day: pt.day_of_week,
    timeRange: formatTimeRange(pt.hour),
  }));

    return { best_times: bestTimes, worst_times: worstTimes };
  } catch (error) {
    console.error('Error fetching peak times:', error);
    return null;
  }
}

/**
 * Get trending status for multiple destinations
 */
export async function getTrendingStatus(
  destinationIds: number[]
): Promise<Map<number, TrendingDestination>> {
  const trendingMap = new Map<number, TrendingDestination>();

  try {
    const response = await fetch(
      `/api/ml/forecast/trending?top_n=100&forecast_days=7`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      return trendingMap;
    }

    const data = await response.json();

    if (!data.trending || data.trending.length === 0) {
      return trendingMap;
    }

    // Create map of destination IDs to trending data
    data.trending.forEach((td: TrendingDestination) => {
      if (destinationIds.includes(td.destination_id)) {
        trendingMap.set(td.destination_id, td);
      }
    });

    return trendingMap;
  } catch (error) {
    console.error('Error fetching trending data:', error);
    return trendingMap;
  }
}

/**
 * Get trending badge text and emoji
 */
export function getTrendingBadge(trendDirection: 'rising' | 'stable' | 'falling'): {
  text: string;
  emoji: string;
  color: string;
} | null {
  switch (trendDirection) {
    case 'rising':
      return { text: 'Trending', emoji: '↗', color: 'text-gray-600 dark:text-gray-400' };
    case 'falling':
      return { text: 'Less popular', emoji: '↘', color: 'text-gray-600 dark:text-gray-400' };
    case 'stable':
      return null; // Don't show badge for stable
  }
}

/**
 * Format hour into a readable time range
 */
function formatTimeRange(hour: number): string {
  const startHour = hour;
  const endHour = (hour + 1) % 24;

  const formatHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

/**
 * Format best time recommendation into natural language
 */
export function formatBestTimeText(recommendation: PeakTimeRecommendation): string {
  if (recommendation.best_times.length === 0) {
    return '';
  }

  const bestTime = recommendation.best_times[0];
  return `Best time: ${bestTime.day} ${bestTime.timeRange}`;
}
