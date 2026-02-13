'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Skeleton } from '@/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';

interface EnrichmentStats {
  total: number;
  enriched: number;
  notEnriched: number;
}

interface EnrichmentResult {
  success?: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
}

interface EnrichmentPanelProps {
  cities: string[];
  onEnrichmentComplete: () => void;
}

export function EnrichmentPanel({ cities, onEnrichmentComplete }: EnrichmentPanelProps) {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [batchFilter, setBatchFilter] = useState<'not_enriched' | 'all' | 'city'>('not_enriched');
  const [selectedCity, setSelectedCity] = useState('');
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastResult, setLastResult] = useState<EnrichmentResult | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      const [
        { count: total },
        { count: enriched },
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
      ]);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        notEnriched: (total || 0) - (enriched || 0),
      });
    } catch (error) {
      console.error('Failed to fetch enrichment stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const runBatchEnrichment = async () => {
    setLoading(true);
    setLastResult(null);
    setBatchProgress({ current: 0, total: batchSize });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      let query = supabase.from('destinations').select('slug');

      if (batchFilter === 'not_enriched') {
        query = query.is('last_enriched_at', null);
      } else if (batchFilter === 'city' && selectedCity) {
        query = query.eq('city', selectedCity);
      }

      query = query.limit(batchSize);

      const { data: destinations, error } = await query;

      if (error) throw error;
      if (!destinations || destinations.length === 0) {
        setLastResult({ error: 'No destinations found matching criteria', timestamp: new Date().toISOString() });
        setLoading(false);
        setBatchProgress(null);
        return;
      }

      setBatchProgress({ current: 0, total: destinations.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        setBatchProgress({ current: i + 1, total: destinations.length });

        try {
          const res = await fetch('/api/enrich-google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ slug: dest.slug }),
          });

          const json = await res.json();
          if (json.success || json.enriched) {
            successCount++;
          } else {
            errorCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {
          errorCount++;
        }
      }

      setLastResult({
        success: true,
        message: `Batch complete: ${successCount} enriched, ${errorCount} errors`,
        timestamp: new Date().toISOString(),
      });

      fetchStats();
      onEnrichmentComplete();
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to run batch enrichment';
      setLastResult({ error, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  const enrichmentProgress = stats ? Math.round((stats.enriched / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-gray-800/50">
      {/* Stats Row */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
          {statsLoading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
              {stats?.total.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Enriched</span>
          {statsLoading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
              {stats?.enriched.toLocaleString()}
              <Badge variant="secondary" className="text-[10px] ml-1.5">{enrichmentProgress}%</Badge>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-300">Needs</span>
          {statsLoading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 tabular-nums">
              {stats?.notEnriched.toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchStats}
          disabled={statsLoading}
          className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title="Refresh stats"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Progress Bar */}
      {!statsLoading && stats && (
        <Progress value={enrichmentProgress} className="h-1.5" />
      )}

      {/* Batch Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Filter</label>
          <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val as typeof batchFilter)}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <Filter className="w-3 h-3 mr-1.5 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_enriched">Not Enriched</SelectItem>
              <SelectItem value="all">All Destinations</SelectItem>
              <SelectItem value="city">By City</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {batchFilter === 'city' && (
          <div>
            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">City</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="Select city..." />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">Batch Size</label>
          <Select value={String(batchSize)} onValueChange={(val) => setBatchSize(Number(val))}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 destinations</SelectItem>
              <SelectItem value="10">10 destinations</SelectItem>
              <SelectItem value="25">25 destinations</SelectItem>
              <SelectItem value="50">50 destinations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={runBatchEnrichment}
          disabled={loading || (batchFilter === 'city' && !selectedCity)}
          className="h-8 text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1.5" />
              Start Batch
            </>
          )}
        </Button>
      </div>

      {/* Batch Progress */}
      {batchProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Processing batch...</span>
            <span className="tabular-nums">{batchProgress.current} / {batchProgress.total}</span>
          </div>
          <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-1.5" />
        </div>
      )}

      {/* Result Banner */}
      {lastResult && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          lastResult.error
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50'
        }`}>
          {lastResult.error ? (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{lastResult.error || lastResult.message}</span>
          {lastResult.timestamp && (
            <span className="ml-auto text-gray-400 flex-shrink-0">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
