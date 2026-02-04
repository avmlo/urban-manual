'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination } from '@/types/destination';

export interface Recommendation {
  destinationId: number;
  score: number;
  reason?: string;
  destination?: Destination;
}

interface UseRecommendationsOptions {
  limit?: number;
  enabled?: boolean;
  onSuccess?: (recommendations: Recommendation[]) => void;
  filterCity?: string; // Filter by city slug
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = 20, enabled = true, onSuccess, filterCity } = options;
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = forceRefresh 
        ? `/api/recommendations?refresh=true&limit=${limit}`
        : `/api/recommendations?limit=${limit}`;
      
      if (filterCity) {
        url += `&city=${encodeURIComponent(filterCity)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - silently fail
          setRecommendations([]);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to load recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      let recs = data.recommendations || [];
      
      // Filter by city on client-side if needed (as backup)
      if (filterCity && recs.length > 0) {
        recs = recs.filter((rec: Recommendation) => 
          rec.destination?.city?.toLowerCase() === filterCity.toLowerCase()
        );
      }
      
      setRecommendations(recs);
      setCached(data.cached || false);

      if (onSuccess) {
        onSuccess(recs);
      }
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, filterCity, onSuccess]);

  useEffect(() => {
    if (enabled) {
      fetchRecommendations();
    }
  }, [enabled, fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    cached,
    refetch: () => fetchRecommendations(true),
  };
}

