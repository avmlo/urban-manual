'use client';

import { useState } from 'react';
import { AdvancedAnalyticsDashboard } from '@/features/admin/components/analytics';
import { SearchInsights } from '@/features/admin/components/analytics/SearchInsights';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'searches'>('overview');

  return (
    <div className="space-y-8">
      {/* Section tabs */}
      <div className="flex gap-4 text-xs">
        <button
          onClick={() => setActiveSection('overview')}
          className={`transition-all ${
            activeSection === 'overview'
              ? 'font-medium text-black dark:text-white'
              : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSection('searches')}
          className={`transition-all ${
            activeSection === 'searches'
              ? 'font-medium text-black dark:text-white'
              : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
          }`}
        >
          Search Insights
        </button>
      </div>

      {activeSection === 'overview' ? (
        <AdvancedAnalyticsDashboard />
      ) : (
        <SearchInsights />
      )}
    </div>
  );
}
