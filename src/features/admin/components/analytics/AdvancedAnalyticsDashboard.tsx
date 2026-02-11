'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  totalSearches: number;
  totalSaves: number;
  totalUsers: number;
  viewsTrend: number;
  searchesTrend: number;
  savesTrend: number;
  usersTrend: number;
  dailyViews: { label: string; value: number }[];
  topDestinations: { name: string; city: string; slug: string; views: number; saves: number }[];
  topSearches: { query: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  topCities: { city: string; count: number }[];
}

type DateRange = '7d' | '30d' | '90d';

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();

      setData({
        totalViews: analyticsData.summary.totalViews,
        totalSearches: analyticsData.summary.totalSearches,
        totalSaves: analyticsData.summary.totalSaves,
        totalUsers: analyticsData.summary.totalUsers,
        viewsTrend: analyticsData.summary.viewsTrend,
        searchesTrend: analyticsData.summary.searchesTrend,
        savesTrend: analyticsData.summary.savesTrend,
        usersTrend: analyticsData.summary.usersTrend,
        dailyViews: analyticsData.dailyViews.map((d: { date: string; label: string; views: number }) => ({
          label: d.label,
          value: d.views,
        })),
        topDestinations: analyticsData.topDestinations,
        topSearches: analyticsData.topSearches,
        categoryBreakdown: analyticsData.categoryBreakdown,
        topCities: analyticsData.topCities,
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const handleExport = () => {
    if (!data) return;
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Views', data.totalViews],
      ['Total Searches', data.totalSearches],
      ['Total Saves', data.totalSaves],
      ['Total Users', data.totalUsers],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const maxViews = Math.max(...(data?.dailyViews.map(d => d.value) || [1]));

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(value)}%
      </span>
    );
  };

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[var(--editorial-text-secondary)] mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="text-sm text-[var(--editorial-text-primary)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`transition-all ${
                dateRange === range
                  ? 'font-medium text-[var(--editorial-text-primary)]'
                  : 'font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Primary Stats - Matches account page style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light">{data?.totalViews.toLocaleString()}</span>
              <TrendIndicator value={data?.viewsTrend || 0} />
            </div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)] mt-1">Page Views</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light">{data?.totalSearches.toLocaleString()}</span>
              <TrendIndicator value={data?.searchesTrend || 0} />
            </div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)] mt-1">Searches</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light">{data?.totalSaves.toLocaleString()}</span>
              <TrendIndicator value={data?.savesTrend || 0} />
            </div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)] mt-1">Saves</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light">{data?.totalUsers.toLocaleString()}</span>
              <TrendIndicator value={data?.usersTrend || 0} />
            </div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)] mt-1">Users</div>
        </div>
      </div>

      {/* Daily Views Chart - Simple bar chart */}
      <div>
        <h2 className="text-xs font-medium mb-4 text-[var(--editorial-text-secondary)]">Daily Views</h2>
        {loading ? (
          <div className="h-32 bg-[var(--editorial-border-subtle)] rounded-lg animate-pulse" />
        ) : (
          <div className="flex items-end gap-1 h-32">
            {data?.dailyViews.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[var(--editorial-text-primary)] rounded-t transition-all"
                  style={{ height: `${(day.value / maxViews) * 100}%`, minHeight: '2px' }}
                />
                <span className="text-[9px] text-[var(--editorial-text-tertiary)] truncate w-full text-center">
                  {i % Math.ceil(data.dailyViews.length / 7) === 0 ? day.label : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Top Destinations */}
        <div>
          <h2 className="text-xs font-medium mb-4 text-[var(--editorial-text-secondary)]">Top Destinations</h2>
          <div className="divide-y divide-[var(--editorial-border-subtle)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 flex justify-between">
                  <div className="h-4 w-32 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                  <div className="h-4 w-12 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                </div>
              ))
            ) : data?.topDestinations.length === 0 ? (
              <p className="py-8 text-sm text-[var(--editorial-text-tertiary)] text-center">No destination views yet</p>
            ) : (
              data?.topDestinations.slice(0, 8).map((dest, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--editorial-text-tertiary)] w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm">{dest.name}</p>
                      <p className="text-xs text-[var(--editorial-text-tertiary)]">{dest.city}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--editorial-text-secondary)] tabular-nums">{dest.views.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Searches */}
        <div>
          <h2 className="text-xs font-medium mb-4 text-[var(--editorial-text-secondary)]">Popular Searches</h2>
          <div className="divide-y divide-[var(--editorial-border-subtle)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 flex justify-between">
                  <div className="h-4 w-40 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                  <div className="h-4 w-12 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                </div>
              ))
            ) : data?.topSearches.length === 0 ? (
              <p className="py-8 text-sm text-[var(--editorial-text-tertiary)] text-center">No search queries yet</p>
            ) : (
              data?.topSearches.map((search, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <span className="text-sm">{search.query}</span>
                  <span className="text-xs text-[var(--editorial-text-secondary)] tabular-nums">{search.count.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h2 className="text-xs font-medium mb-4 text-[var(--editorial-text-secondary)]">Content by Category</h2>
        <div className="flex flex-wrap gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 w-24 bg-[var(--editorial-border-subtle)] rounded-lg animate-pulse" />
            ))
          ) : (
            data?.categoryBreakdown.map((cat, i) => (
              <div key={i} className="px-4 py-3 border border-[var(--editorial-border)] rounded-lg">
                <div className="text-lg font-light">{cat.count}</div>
                <div className="text-xs text-[var(--editorial-text-secondary)] capitalize">{cat.category}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cities */}
      <div>
        <h2 className="text-xs font-medium mb-4 text-[var(--editorial-text-secondary)]">Destinations by City</h2>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                <div className="h-1.5 bg-[var(--editorial-border-subtle)] rounded-full" />
              </div>
            ))
          ) : (
            data?.topCities.map((city, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--editorial-text-primary)]">{city.city}</span>
                  <span className="text-[var(--editorial-text-tertiary)] tabular-nums">{city.count}</span>
                </div>
                <div className="h-1 bg-[var(--editorial-border-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--editorial-text-primary)] rounded-full"
                    style={{
                      width: `${(city.count / (data?.topCities[0]?.count || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
