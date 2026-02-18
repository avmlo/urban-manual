/**
 * Hook for ML-powered sentiment analysis
 */

'use client';

import { useQueryFetching } from '@/hooks/useQueryFetching';

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

  const { data, isLoading, error, refetch } = useQueryFetching<DestinationSentiment>(
    async () => {
      const response = await fetch(
        `/api/ml/sentiment?destination_id=${destinationId}&days=${days}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sentiment');
      }

      return response.json();
    },
    {
      queryKey: ['ml-sentiment', destinationId, days],
      enabled: enabled && !!destinationId,
      staleTime: 10 * 60 * 1000,
    }
  );

  return {
    sentiment: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: async () => { await refetch(); },
  };
}
