"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Search, Eye, MousePointerClick } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalSearches: number;
    totalViews: number;
    discoveryEngineEnabled: boolean;
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
  popularQueries: Array<{ query: string; count: number }>;
  popularDestinations: Array<{ slug: string; count: number }>;
  searchTrends: Array<{ date: string; count: number }>;
  metrics: {
    averageResultsPerQuery: number;
    clickThroughRate: number;
    searchToSaveRate: number;
  };
}

interface AnalyticsDashboardProps {
  variant?: "page" | "embedded";
}

export default function AnalyticsDashboard({ variant = "page" }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, dateRange.start, dateRange.end]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/discovery/analytics?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  const wrapperClass =
    variant === "page"
      ? "min-h-screen bg-white dark:bg-gray-900 px-6 md:px-12 lg:px-16 py-12"
      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6";

  const LoadingState = (
    <div
      className={`${
        variant === "page" ? "min-h-[50vh]" : "py-12"
      } flex items-center justify-center`}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
    </div>
  );

  const EmptyState = (
    <div
      className={`${
        variant === "page" ? "min-h-[50vh]" : "py-12"
      } flex items-center justify-center`}
    >
      <p className="text-gray-600 dark:text-gray-400">Failed to load analytics</p>
    </div>
  );

  const AuthState = (
    <div
      className={`${
        variant === "page" ? "min-h-[50vh]" : "py-12"
      } flex items-center justify-center`}
    >
      <p className="text-gray-600 dark:text-gray-400">Please sign in to view analytics</p>
    </div>
  );

  if (!user) {
    return variant === "page" ? <div className={wrapperClass}>{AuthState}</div> : AuthState;
  }

  if (loading) {
    return variant === "page" ? <div className={wrapperClass}>{LoadingState}</div> : LoadingState;
  }

  if (!analytics) {
    return variant === "page" ? <div className={wrapperClass}>{EmptyState}</div> : EmptyState;
  }

  const content = (
    <div className={variant === "page" ? "container mx-auto" : "space-y-8"}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Search Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Insights into search behavior and Discovery Engine performance
        </p>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <Search className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Searches</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.summary.totalSearches.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.summary.totalViews.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">\n            <MousePointerClick className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">CTR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(analytics.metrics.clickThroughRate * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Discovery Engine</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.summary.discoveryEngineEnabled ? "✓ Enabled" : "✗ Disabled"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Popular Search Queries</h2>
        <div className="space-y-2">
          {analytics.popularQueries.slice(0, 10).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-gray-900 dark:text-white">{item.query}</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Popular Destinations</h2>
        <div className="space-y-2">
          {analytics.popularDestinations.slice(0, 10).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-gray-900 dark:text-white">{item.slug}</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Search Trends</h2>
        <div className="space-y-2">
          {analytics.searchTrends.slice(-10).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-gray-600 dark:text-gray-400">{item.date}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gray-900 dark:bg-white h-2 rounded-full"
                    style={{
                      width: `${
                        (item.count /
                          Math.max(...analytics.searchTrends.map((t) => t.count))) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-gray-900 dark:text-white font-medium w-12 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return variant === "page" ? <div className={wrapperClass}>{content}</div> : <div className="space-y-6">{content}</div>;
}
