/**
 * Hook for ML-powered recommendations from Python microservice
 *
 * Falls back to existing recommendation system if ML service is unavailable.
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useQueryFetching } from '@/hooks/useQueryFetching';

interface MLRecommendation {
  destination_id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  score: number;
  reason: string;
}

interface MLRecommendationsResponse {
  user_id: string;
  recommendations: MLRecommendation[];
  total: number;
  model_version: string;
  generated_at: string;
  from_cache: boolean;
}

interface MLRecommendationsResult {
  recommendations: MLRecommendation[];
  isMLPowered: boolean;
  isFallback: boolean;
}

interface UseMLRecommendationsOptions {
  enabled?: boolean;
  topN?: number;
  excludeVisited?: boolean;
  excludeSaved?: boolean;
  fallbackToExisting?: boolean;
}

interface UseMLRecommendationsReturn {
  recommendations: MLRecommendation[];
  loading: boolean;
  error: string | null;
  isMLPowered: boolean;
  isFallback: boolean;
  refetch: () => void;
}

export function useMLRecommendations(
  options: UseMLRecommendationsOptions = {}
): UseMLRecommendationsReturn {
  const {
    enabled = true,
    topN = 10,
    excludeVisited = true,
    excludeSaved = true,
    fallbackToExisting = true
  } = options;

  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQueryFetching<MLRecommendationsResult>(
    async () => {
      // Try ML service first
      const mlResponse = await fetch(
        `/api/ml/recommend?top_n=${topN}&exclude_visited=${excludeVisited}&exclude_saved=${excludeSaved}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (mlResponse.ok) {
        const mlData: MLRecommendationsResponse = await mlResponse.json();
        if (mlData.recommendations && mlData.recommendations.length > 0) {
          return {
            recommendations: mlData.recommendations,
            isMLPowered: true,
            isFallback: false,
          };
        }
      }

      // If ML service fails or returns no results, fall back to existing system
      if (fallbackToExisting && user) {
        console.log('ML service unavailable, falling back to existing recommendations');
        const fallbackResponse = await fetch(`/api/personalization/${user.id}`);

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const transformedRecs: MLRecommendation[] = (fallbackData.recommendations || []).map((rec: any) => ({
            destination_id: rec.id,
            slug: rec.slug,
            name: rec.name,
            city: rec.city,
            category: rec.category,
            score: 0.8,
            reason: 'Recommended for you'
          }));

          return {
            recommendations: transformedRecs,
            isMLPowered: false,
            isFallback: true,
          };
        }
      }

      throw new Error('ML service unavailable');
    },
    {
      queryKey: ['ml-recommendations', user?.id, topN, excludeVisited, excludeSaved],
      enabled: enabled && !!user,
      staleTime: 5 * 60 * 1000,
      retryCount: 1,
    }
  );

  return {
    recommendations: data?.recommendations ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    isMLPowered: data?.isMLPowered ?? false,
    isFallback: data?.isFallback ?? false,
    refetch: async () => { await refetch(); },
  };
}

/**
 * Hook for trending destinations from ML service
 */
interface TrendingDestination {
  destination_id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  growth_rate: number;
  current_demand: number;
  forecast_demand: number;
  image?: string;
}

interface UseTrendingOptions {
  enabled?: boolean;
  topN?: number;
  forecastDays?: number;
}

export function useMLTrending(options: UseTrendingOptions = {}) {
  const { enabled = true, topN = 20, forecastDays = 7 } = options;

  const { data, isLoading, error } = useQueryFetching<TrendingDestination[]>(
    async () => {
      const response = await fetch(
        `/api/ml/forecast/trending?top_n=${topN}&forecast_days=${forecastDays}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trending destinations');
      }

      const responseData = await response.json();
      return responseData.trending || [];
    },
    {
      queryKey: ['ml-trending', topN, forecastDays],
      enabled,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    trending: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}
