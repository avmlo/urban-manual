/**
 * Hook for ML-powered topic modeling
 */

'use client';

import { useQueryFetching } from '@/hooks/useQueryFetching';

interface Topic {
  topic_id: number;
  topic_name: string;
  keywords: string[];
  frequency: number;
  representative_docs: string[];
}

interface TopicsResult {
  topics: Topic[];
  total_topics: number;
  generated_at: string;
}

interface UseTopicsOptions {
  city?: string;
  destinationId?: number;
  minTopicSize?: number;
  enabled?: boolean;
}

interface UseTopicsReturn {
  topics: TopicsResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMLTopics(options: UseTopicsOptions = {}): UseTopicsReturn {
  const { city, destinationId, minTopicSize = 5, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQueryFetching<TopicsResult>(
    async () => {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (destinationId) params.append('destination_id', destinationId.toString());
      params.append('min_topic_size', minTopicSize.toString());

      const response = await fetch(`/api/ml/topics?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }

      return response.json();
    },
    {
      queryKey: ['ml-topics', city, destinationId, minTopicSize],
      enabled: enabled && !!(city || destinationId),
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    topics: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: async () => { await refetch(); },
  };
}
