/**
 * Hook for ML-powered explainable AI
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureImportance {
  feature: string;
  importance: number;
  contribution: number;
}

interface Explanation {
  user_id: string;
  destination_id: number;
  predicted_score: number;
  method: 'shap' | 'lime' | 'simple';
  feature_importance?: {
    user_features: FeatureImportance[];
    item_features: FeatureImportance[];
  };
  explanation: string;
  generated_at: string;
}

interface UseExplainOptions {
  destinationId: number;
  method?: 'shap' | 'lime' | 'simple';
  enabled?: boolean;
}

interface UseExplainReturn {
  explanation: Explanation | null;
  loading: boolean;
  error: string | null;
  explain: () => void;
}

export function useMLExplain(options: UseExplainOptions): UseExplainReturn {
  const { destinationId, method = 'shap', enabled = true } = options;
  const { user } = useAuth();

  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(async () => {
    if (!enabled || !user || !destinationId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          destination_id: destinationId,
          method
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data);
      } else {
        setError('Failed to generate explanation');
      }
    } catch (err) {
      console.error('Error generating explanation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate explanation');
    } finally {
      setLoading(false);
    }
  }, [enabled, user, destinationId, method]);

  return {
    explanation,
    loading,
    error,
    explain
  };
}

