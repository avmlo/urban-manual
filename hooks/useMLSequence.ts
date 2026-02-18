/**
 * Hook for ML-powered sequence prediction
 */

'use client';

import { useState } from 'react';
import { useQueryMutation } from '@/hooks/useQueryFetching';

interface SequencePrediction {
  action: string;
  probability: number;
  confidence: number;
}

interface SequenceResult {
  current_sequence: string[];
  predictions: SequencePrediction[];
  generated_at: string;
}

interface UseSequenceOptions {
  enabled?: boolean;
}

interface UseSequenceReturn {
  predictions: SequenceResult | null;
  loading: boolean;
  error: string | null;
  predict: (sequence: string[], topN?: number) => void;
}

export function useMLSequence(options: UseSequenceOptions = {}): UseSequenceReturn {
  const { enabled = true } = options;
  const [predictions, setPredictions] = useState<SequenceResult | null>(null);

  const { mutate, isPending, error } = useQueryMutation<SequenceResult, { sequence: string[]; topN: number }>(
    async ({ sequence, topN }) => {
      if (!enabled || !sequence || sequence.length === 0) {
        throw new Error('Invalid sequence');
      }

      const response = await fetch('/api/ml/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_sequence: sequence,
          top_n: topN
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to predict next actions');
      }

      return response.json();
    },
    {
      onSuccess: (data) => {
        setPredictions(data);
      },
    }
  );

  return {
    predictions,
    loading: isPending,
    error: error?.message ?? null,
    predict: (sequence: string[], topN = 3) => mutate({ sequence, topN }),
  };
}
