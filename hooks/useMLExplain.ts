/**
 * Hook for ML-powered explainable AI
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryMutation } from '@/hooks/useQueryFetching';

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

  const { mutate, isPending, error } = useQueryMutation<Explanation, void>(
    async () => {
      if (!enabled || !user || !destinationId) {
        throw new Error('Missing required parameters');
      }

      const response = await fetch('/api/ml/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          destination_id: destinationId,
          method
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate explanation');
      }

      return response.json();
    },
    {
      onSuccess: (data) => {
        setExplanation(data);
      },
    }
  );

  return {
    explanation,
    loading: isPending,
    error: error?.message ?? null,
    explain: () => mutate(),
  };
}
