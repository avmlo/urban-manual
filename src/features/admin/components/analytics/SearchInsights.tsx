'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  RefreshCcw,
  Search,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Filter,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';

type SearchLog = {
  id: number;
  created_at: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
};

type DateRange = '24h' | '7d' | '30d' | '90d';

export function SearchInsights() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics'>('analytics');

  const getDateFilter = useCallback((range: DateRange) => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, user_id, metadata')
        .eq('interaction_type', 'search')
        .gte('created_at', getDateFilter(dateRange))
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load search logs');
    } finally {
      setLoading(false);
    }
  }, [dateRange, getDateFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const analytics = useMemo(() => {
    if (logs.length === 0) return null;

    const queryCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const noResultQueries: string[] = [];
    const totalSearches = logs.length;

    logs.forEach((log) => {
      const metadata = log.metadata ?? {};
      const query = (metadata.query as string) || '';
      const intent = (metadata.intent as Record<string, unknown>) || {};
      const count = (metadata.count as number) || 0;
      const city = (intent.city as string) || (metadata.filters as Record<string, unknown>)?.city as string || '';
      const category = (intent.category as string) || (metadata.filters as Record<string, unknown>)?.category as string || '';

      if (query) {
        const normalizedQuery = query.toLowerCase().trim();
        queryCounts[normalizedQuery] = (queryCounts[normalizedQuery] || 0) + 1;
        if (count === 0 && !noResultQueries.includes(normalizedQuery)) {
          noResultQueries.push(normalizedQuery);
        }
      }
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
      if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return {
      totalSearches,
      uniqueQueries: Object.keys(queryCounts).length,
      topQueries: Object.entries(queryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
      topCities: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topCategories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      noResultQueries: noResultQueries.slice(0, 20),
      noResultCount: noResultQueries.length,
    };
  }, [logs]);

  return (
    <section className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === 'analytics'
                ? 'font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-800'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === 'logs'
                ? 'font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-800'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Search Logs
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(val) => setDateRange(val as DateRange)}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadLogs} disabled={loading} size="sm">
            <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No search activity recorded in this period.</p>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Searches" value={analytics?.totalSearches || 0} icon={<Search className="w-4 h-4 text-blue-500" />} />
            <StatCard label="Unique Queries" value={analytics?.uniqueQueries || 0} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
            <StatCard label="No Results" value={analytics?.noResultCount || 0} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} warning={(analytics?.noResultCount ?? 0) > 10} />
            <StatCard label="Searches/Day" value={Math.round((analytics?.totalSearches || 0) / (dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90))} icon={<BarChart3 className="w-4 h-4 text-purple-500" />} />
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                Top Search Terms
              </h3>
              <div className="space-y-2">
                {analytics?.topQueries.map(([query, count], i) => (
                  <div key={query} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{query}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2">{count}</Badge>
                  </div>
                ))}
                {(!analytics?.topQueries || analytics.topQueries.length === 0) && (
                  <p className="text-xs text-gray-400">No search queries recorded</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                Top Cities Searched
              </h3>
              <div className="space-y-2">
                {analytics?.topCities.map(([city, count]) => (
                  <div key={city} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{city}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
                {(!analytics?.topCities || analytics.topCities.length === 0) && (
                  <p className="text-xs text-gray-400">No city filters used</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                Top Categories
              </h3>
              <div className="space-y-2">
                {analytics?.topCategories.map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{category}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
                {(!analytics?.topCategories || analytics.topCategories.length === 0) && (
                  <p className="text-xs text-gray-400">No category filters used</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Gaps */}
          {analytics?.noResultQueries && analytics.noResultQueries.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20 p-6">
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Content Gaps (Searches with No Results)
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-4">
                Users searched for these terms but found no matching destinations.
              </p>
              <div className="flex flex-wrap gap-2">
                {analytics.noResultQueries.map((query) => (
                  <Badge key={query} variant="outline" className="text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200">
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium text-gray-500">Time</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">User</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Query</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">City</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Category</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Results</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 100).map((log) => {
                  const metadata = log.metadata ?? {};
                  const q = (metadata.query as string) || '';
                  const intent = (metadata.intent as Record<string, unknown>) || {};
                  const filters = (metadata.filters as Record<string, unknown>) || {};
                  const count = (metadata.count as number) ?? '';
                  const source = (metadata.source as string) || '';
                  return (
                    <tr key={log.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{log.user_id ? log.user_id.substring(0, 8) : 'anon'}</td>
                      <td className="py-2 pr-4 max-w-[360px] truncate" title={q}>{q}</td>
                      <td className="py-2 pr-4">{(intent.city as string) || (filters.city as string) || ''}</td>
                      <td className="py-2 pr-4 capitalize">{(intent.category as string) || (filters.category as string) || ''}</td>
                      <td className="py-2 pr-4">
                        {count === 0 ? (
                          <Badge variant="destructive" className="text-xs">0</Badge>
                        ) : (
                          count
                        )}
                      </td>
                      <td className="py-2 pr-4">{source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {logs.length > 100 && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Showing 100 of {logs.length} search logs
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, icon, warning = false }: { label: string; value: number; icon: React.ReactNode; warning?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${
      warning
        ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20'
        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
