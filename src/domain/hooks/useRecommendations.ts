'use client';

import { Destination } from '@/types/destination';
import { useQueryFetching } from '@/hooks/useQueryFetching';

export interface Recommendation {
  destinationId: number;
  score: number;
  reason?: string;
  destination?: Destination;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  cached?: boolean;
}

interface UseRecommendationsOptions {
  limit?: number;
  enabled?: boolean;
  onSuccess?: (recommendations: Recommendation[]) => void;
  filterCity?: string;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = 20, enabled = true, onSuccess, filterCity } = options;

  const { data, isLoading, error, invalidate } = useQueryFetching<RecommendationsResponse>(
    async () => {
      let url = `/api/recommendations?limit=${limit}`;
      if (filterCity) {
        url += `&city=${encodeURIComponent(filterCity)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          return { recommendations: [], cached: false };
        }
        throw new Error(`Failed to load recommendations: ${response.statusText}`);
      }

      const responseData = await response.json();
      let recs: Recommendation[] = responseData.recommendations || [];

      // Filter by city on client-side if needed (as backup)
      if (filterCity && recs.length > 0) {
        recs = recs.filter((rec: Recommendation) =>
          rec.destination?.city?.toLowerCase() === filterCity.toLowerCase()
        );
      }

      return { recommendations: recs, cached: responseData.cached || false };
    },
    {
      queryKey: ['recommendations', limit, filterCity],
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => {
        onSuccess?.(data.recommendations);
      },
    }
  );

  return {
    recommendations: data?.recommendations ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    cached: data?.cached ?? false,
    refetch: async () => {
      // Force refresh by invalidating then refetching
      await invalidate();
    },
  };
}
