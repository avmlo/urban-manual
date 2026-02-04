/**
 * Hook for ML-powered recommendations from Python microservice
 *
 * Falls back to existing recommendation system if ML service is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMLPowered, setIsMLPowered] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try ML service first
      const mlResponse = await fetch(
        `/api/ml/recommend?top_n=${topN}&exclude_visited=${excludeVisited}&exclude_saved=${excludeSaved}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (mlResponse.ok) {
        const data: MLRecommendationsResponse = await mlResponse.json();

        if (data.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
          setIsMLPowered(true);
          setIsFallback(false);
          setLoading(false);
          return;
        }
      }

      // If ML service fails or returns no results, fall back to existing system
      if (fallbackToExisting) {
        console.log('ML service unavailable, falling back to existing recommendations');

        const fallbackResponse = await fetch(`/api/personalization/${user.id}`);

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();

          // Transform existing format to ML format for consistency
          const transformedRecs: MLRecommendation[] = fallbackData.recommendations?.map((rec: any) => ({
            destination_id: rec.id,
            slug: rec.slug,
            name: rec.name,
            city: rec.city,
            category: rec.category,
            score: 0.8, // Default score for fallback
            reason: 'Recommended for you'
          })) || [];

          setRecommendations(transformedRecs);
          setIsMLPowered(false);
          setIsFallback(true);
        }
      } else {
        setError('ML service unavailable');
      }

    } catch (err) {
      console.error('Error fetching ML recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');

      // Try fallback
      if (fallbackToExisting && user) {
        try {
          const fallbackResponse = await fetch(`/api/personalization/${user.id}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const transformedRecs: MLRecommendation[] = fallbackData.recommendations?.map((rec: any) => ({
              destination_id: rec.id,
              slug: rec.slug,
              name: rec.name,
              city: rec.city,
              category: rec.category,
              score: 0.8,
              reason: 'Recommended for you'
            })) || [];

            setRecommendations(transformedRecs);
            setIsMLPowered(false);
            setIsFallback(true);
          }
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, user, topN, excludeVisited, excludeSaved, fallbackToExisting]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    isMLPowered,
    isFallback,
    refetch: fetchRecommendations
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

  const [trending, setTrending] = useState<TrendingDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchTrending = async () => {
      try {
        const response = await fetch(
          `/api/ml/forecast/trending?top_n=${topN}&forecast_days=${forecastDays}`
        );

        if (response.ok) {
          const data = await response.json();
          setTrending(data.trending || []);
        } else {
          setError('Failed to fetch trending destinations');
        }
      } catch (err) {
        console.error('Error fetching trending:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trending');
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [enabled, topN, forecastDays]);

  return { trending, loading, error };
}
