'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Crown,
  Users,
  TrendingUp,
  AlertTriangle,
  ImageOff,
  FileText,
  Sparkles,
  Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/ui/badge';
import { Skeleton } from '@/ui/skeleton';
import { Progress } from '@/ui/progress';

interface DashboardStats {
  totalDestinations: number;
  enrichedDestinations: number;
  michelinSpots: number;
  crownPicks: number;
  totalSaves: number;
  activeUsers: number;
  missingImages: number;
  missingDescriptions: number;
  notEnriched: number;
  addedThisWeek: number;
  recentDestinations: { name: string; city: string; category: string; slug: string }[];
  topCities: { city: string; count: number }[];
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: totalDestinations },
          { count: enrichedCount },
          { count: michelinCount },
          { count: crownCount },
          { count: totalSaves },
          { count: missingImages },
          { count: missingDescriptions },
          { count: notEnriched },
          { count: addedThisWeek },
          { data: recentDests },
          { data: allDests },
          { count: totalUsers },
        ] = await Promise.all([
          supabase.from('destinations').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).gt('michelin_stars', 0),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).eq('crown', true),
          supabase.from('saved_places').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('description.is.null,description.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('destinations').select('name, city, category, slug').order('created_at', { ascending: false }).limit(6),
          supabase.from('destinations').select('city'),
          supabase.from('user_preferences').select('*', { count: 'exact', head: true }),
        ]);

        const cityCount: Record<string, number> = {};
        allDests?.forEach(d => {
          if (d.city) cityCount[d.city] = (cityCount[d.city] || 0) + 1;
        });

        const topCities = Object.entries(cityCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([city, count]) => ({ city, count }));

        setStats({
          totalDestinations: totalDestinations || 0,
          enrichedDestinations: enrichedCount || 0,
          michelinSpots: michelinCount || 0,
          crownPicks: crownCount || 0,
          totalSaves: totalSaves || 0,
          activeUsers: totalUsers || 0,
          missingImages: missingImages || 0,
          missingDescriptions: missingDescriptions || 0,
          notEnriched: notEnriched || 0,
          addedThisWeek: addedThisWeek || 0,
          recentDestinations: recentDests || [],
          topCities,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const attentionItems = stats ? [
    stats.missingImages > 0 && { icon: <ImageOff className="w-3.5 h-3.5" />, label: 'Missing images', count: stats.missingImages, href: '/admin/destinations?missing=no_image' },
    stats.missingDescriptions > 0 && { icon: <FileText className="w-3.5 h-3.5" />, label: 'Missing descriptions', count: stats.missingDescriptions, href: '/admin/destinations?missing=no_description' },
    stats.notEnriched > 0 && { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Not enriched', count: stats.notEnriched, href: '/admin/destinations?enriched=not_enriched' },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; count: number; href: string }[] : [];

  return (
    <div className="space-y-10">
      {/* Key numbers */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-y-6">
        <Metric label="Destinations" value={stats?.totalDestinations} loading={loading} />
        <Metric label="Enriched" value={stats?.enrichedDestinations} loading={loading} sub={stats ? `${Math.round((stats.enrichedDestinations / Math.max(stats.totalDestinations, 1)) * 100)}%` : undefined} />
        <Metric label="Crown Picks" value={stats?.crownPicks} loading={loading} />
        <Metric label="Michelin" value={stats?.michelinSpots} loading={loading} />
        <Metric label="User Saves" value={stats?.totalSaves} loading={loading} />
        <Metric label="Users" value={stats?.activeUsers} loading={loading} />
      </div>

      {/* Attention items - compact inline */}
      {!loading && attentionItems.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {attentionItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              {item.icon}
              <span>{item.count} {item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Two columns: Recent + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent additions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Recently Added
            </h3>
            <Link
              href="/admin/destinations"
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : (
              stats?.recentDestinations.map((dest, i) => (
                <Link
                  key={i}
                  href={`/admin/destinations?slug=${dest.slug}`}
                  className="py-2.5 flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-black dark:text-white group-hover:opacity-60 transition-opacity truncate">
                      {dest.name}
                    </p>
                    <p className="text-[11px] text-gray-400">{dest.city}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 capitalize flex-shrink-0 ml-4">
                    {dest.category}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top cities */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
            By City
          </h3>
          <div className="space-y-2.5">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))
            ) : (
              stats?.topCities.map((city) => (
                <div key={city.city} className="flex items-center gap-3">
                  <span className="text-[13px] text-gray-700 dark:text-gray-300 w-24 truncate">{city.city}</span>
                  <div className="flex-1">
                    <Progress
                      value={(city.count / (stats?.topCities[0]?.count || 1)) * 100}
                      className="h-1"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 tabular-nums w-6 text-right">{city.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* This week summary */}
      {!loading && stats && stats.addedThisWeek > 0 && (
        <p className="text-[11px] text-gray-400">
          +{stats.addedThisWeek} destination{stats.addedThisWeek !== 1 ? 's' : ''} added this week
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, loading, sub }: { label: string; value?: number; loading: boolean; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <p className="text-lg font-medium text-black dark:text-white tabular-nums">
          {(value || 0).toLocaleString()}
          {sub && <span className="text-[11px] text-gray-400 font-normal ml-1.5">{sub}</span>}
        </p>
      )}
    </div>
  );
}
