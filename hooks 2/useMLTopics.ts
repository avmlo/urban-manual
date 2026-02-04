/**
 * Hook for ML-powered topic modeling
 */

import { useState, useEffect, useCallback } from 'react';

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

  const [topics, setTopics] = useState<TopicsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!enabled || (!city && !destinationId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (destinationId) params.append('destination_id', destinationId.toString());
      params.append('min_topic_size', minTopicSize.toString());

      const response = await fetch(`/api/ml/topics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      } else {
        setError('Failed to fetch topics');
      }
    } catch (err) {
      console.error('Error fetching topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  }, [enabled, city, destinationId, minTopicSize]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    topics,
    loading,
    error,
    refetch: fetchTopics
  };
}

