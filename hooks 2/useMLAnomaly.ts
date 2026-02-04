/**
 * Hook for ML-powered anomaly detection
 */

import { useState, useEffect, useCallback } from 'react';

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

  const [anomalies, setAnomalies] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (!enabled || (!destinationId && !city)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (destinationId) params.append('destination_id', destinationId.toString());
      if (city) params.append('city', city);
      params.append('days', days.toString());
      params.append('contamination', contamination.toString());
      params.append('type', type);

      const response = await fetch(`/api/ml/anomaly?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnomalies(data);
      } else {
        setError('Failed to fetch anomalies');
      }
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch anomalies');
    } finally {
      setLoading(false);
    }
  }, [enabled, destinationId, city, days, contamination, type]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return {
    anomalies,
    loading,
    error,
    refetch: fetchAnomalies
  };
}

