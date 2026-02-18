/**
 * Hook for ML-powered anomaly detection
 */

'use client';

import { useQueryFetching } from '@/hooks/useQueryFetching';

interface Anomaly {
  date: string;
  metric: string;
  value: number;
  expected_value: number;
  anomaly_score: number;
  type: 'traffic' | 'sentiment';
}

interface AnomalyResult {
  destination_id?: number;
  city?: string;
  anomalies: Anomaly[];
  anomaly_count: number;
  status: string;
  generated_at: string;
}

interface UseAnomalyOptions {
  destinationId?: number;
  city?: string;
  days?: number;
  contamination?: number;
  type?: 'traffic' | 'sentiment';
  enabled?: boolean;
}

interface UseAnomalyReturn {
  anomalies: AnomalyResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMLAnomaly(options: UseAnomalyOptions = {}): UseAnomalyReturn {
  const {
    destinationId,
    city,
    days = 30,
    contamination = 0.1,
    type = 'traffic',
    enabled = true
  } = options;

  const { data, isLoading, error, refetch } = useQueryFetching<AnomalyResult>(
    async () => {
      const params = new URLSearchParams();
      if (destinationId) params.append('destination_id', destinationId.toString());
      if (city) params.append('city', city);
      params.append('days', days.toString());
      params.append('contamination', contamination.toString());
      params.append('type', type);

      const response = await fetch(`/api/ml/anomaly?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch anomalies');
      }

      return response.json();
    },
    {
      queryKey: ['ml-anomaly', destinationId, city, days, contamination, type],
      enabled: enabled && !!(destinationId || city),
      staleTime: 10 * 60 * 1000,
    }
  );

  return {
    anomalies: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: async () => { await refetch(); },
  };
}
