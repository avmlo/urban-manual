import { useQuery } from '@tanstack/react-query';
import { type TrendingDestination } from '@/lib/ml/forecasting';

const FETCH_TRENDING_KEY = ['trending-destinations'];

export function useTrendingDestinations() {
  return useQuery({
    queryKey: FETCH_TRENDING_KEY,
    queryFn: async () => {
      const res = await fetch(
        `/api/ml/forecast/trending?top_n=100&forecast_days=7`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (!res.ok) throw new Error('Failed to fetch trending data');
      const data = await res.json();
      return (data.trending || []) as TrendingDestination[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
