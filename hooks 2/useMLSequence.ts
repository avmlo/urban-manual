/**
 * Hook for ML-powered sequence prediction
 */

import { useState, useCallback } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (sequence: string[], topN = 3) => {
    if (!enabled || !sequence || sequence.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_sequence: sequence,
          top_n: topN
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data);
      } else {
        setError('Failed to predict next actions');
      }
    } catch (err) {
      console.error('Error predicting sequence:', err);
      setError(err instanceof Error ? err.message : 'Failed to predict next actions');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  return {
    predictions,
    loading,
    error,
    predict
  };
}

