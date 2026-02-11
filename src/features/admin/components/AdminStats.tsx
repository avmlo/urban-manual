'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, RefreshCw, MapPin, Database, Award, Crown } from "lucide-react";

interface AdminStatsProps {
  refreshKey?: number;
}

export function AdminStats({ refreshKey }: AdminStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    michelin: 0,
    crown: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadAdminStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient({ skipValidation: true });
      
      // Execute queries in parallel
      const [
        { count: total },
        { count: enriched },
        { count: michelin },
        { count: crown }
      ] = await Promise.all([
        supabase.from('destinations').select('count', { count: 'exact', head: true }),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).not('google_place_id', 'is', null),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).gt('michelin_stars', 0),
        supabase.from('destinations').select('count', { count: 'exact', head: true }).eq('crown', true)
      ]);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        michelin: michelin || 0,
        crown: crown || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats, refreshKey]);

  const statCards = [
    {
      label: 'Destinations',
      value: stats.total,
      icon: MapPin,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Google enriched',
      value: stats.enriched,
      icon: Database,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Michelin spots',
      value: stats.michelin,
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Crown picks',
      value: stats.crown,
      icon: Crown,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--editorial-text-primary)]">Stats</p>
          <p className="text-xs text-[var(--editorial-text-tertiary)]">
            Live counts pulled directly from Supabase.
          </p>
        </div>
        <button
          onClick={() => loadAdminStats()}
          disabled={statsLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--editorial-text-primary)] bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl hover:bg-[var(--editorial-border-subtle)] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${statsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`p-4 rounded-xl border border-[var(--editorial-border)] ${stat.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-[var(--editorial-text-secondary)]">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-[var(--editorial-text-primary)]">
                {statsLoading ? '…' : stat.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

