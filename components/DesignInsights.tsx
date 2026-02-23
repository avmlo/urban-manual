/**
 * Design Insights Panel
 * Architectural connections and context
 */

import { Lightbulb, ArrowRight, Building2 } from 'lucide-react';
import type { ArchitecturalInsight } from '@/types/architecture';

interface DesignInsightsProps {
  insights: ArchitecturalInsight[];
}

export function DesignInsights({ insights }: DesignInsightsProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          No architectural insights available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Architectural Insights</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Discover the connections and context behind these destinations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <Building2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{insight.title}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {insight.type}
                </span>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{insight.description}</p>
            {insight.destinations && insight.destinations.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{insight.destinations.length} destinations</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

