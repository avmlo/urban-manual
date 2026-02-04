/**
 * Hook for ML-powered sentiment analysis
 */

import { useState, useEffect, useCallback } from 'react';

interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
}

interface DestinationSentiment {
  destination_id: number;
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  recent_sentiments: SentimentResult[];
  generated_at: string;
}

interface UseSentimentOptions {
  destinationId?: number;
  days?: number;
  enabled?: boolean;
}

interface UseSentimentReturn {
  sentiment: DestinationSentiment | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMLSentiment(options: UseSentimentOptions = {}): UseSentimentReturn {
  const { destinationId, days = 30, enabled = true } = options;

  const [sentiment, setSentiment] = useState<DestinationSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(async () => {
    if (!enabled || !destinationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ml/sentiment?destination_id=${destinationId}&days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSentiment(data);
      } else {
        setError('Failed to fetch sentiment');
      }
    } catch (err) {
      console.error('Error fetching sentiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sentiment');
    } finally {
      setLoading(false);
    }
  }, [enabled, destinationId, days]);

  useEffect(() => {
    fetchSentiment();
  }, [fetchSentiment]);

  return {
    sentiment,
    loading,
    error,
    refetch: fetchSentiment
  };
}

