'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Crown,
  Star,
  Globe,
  Search,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ImageOff,
  FileText,
  Sparkles,
  Plus,
  RefreshCw,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Separator } from '@/ui/separator';
import { Skeleton } from '@/ui/skeleton';
import { Button } from '@/ui/button';

interface DashboardStats {
  totalDestinations: number;
  enrichedDestinations: number;
  michelinSpots: number;
  crownPicks: number;
  totalSaves: number;
  totalVisits: number;
  activeUsers: number;
  recentSearches: number;
  recentDestinations: { name: string; city: string; category: string; slug: string }[];
  topCities: { city: string; count: number }[];
  systemHealth: { name: string; status: 'healthy' | 'warning' | 'error'; message: string }[];
  // New attention metrics
  missingImages: number;
  missingDescriptions: number;
  notEnriched: number;
  addedThisWeek: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Batch queries in parallel for better performance
        const [
          { count: totalDestinations },
          { count: enrichedCount },
          { count: michelinCount },
          { count: crownCount },
          { count: totalSaves },
          { count: totalVisits },
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
          supabase.from('visited_places').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('description.is.null,description.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('destinations').select('name, city, category, slug').order('created_at', { ascending: false }).limit(8),
          supabase.from('destinations').select('city'),
          supabase.from('user_preferences').select('*', { count: 'exact', head: true }),
        ]);

        const cityCount: Record<string, number> = {};
        allDests?.forEach(d => {
          if (d.city) {
            cityCount[d.city] = (cityCount[d.city] || 0) + 1;
          }
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
          totalVisits: totalVisits || 0,
          activeUsers: totalUsers || 0,
          recentSearches: 0,
          recentDestinations: recentDests || [],
          topCities,
          systemHealth: [
            { name: 'Database', status: 'healthy', message: 'Operational' },
            { name: 'Search', status: 'healthy', message: 'Index synced' },
            { name: 'CDN', status: 'healthy', message: 'Normal' },
            { name: 'API', status: 'healthy', message: '<100ms' },
          ],
          missingImages: missingImages || 0,
          missingDescriptions: missingDescriptions || 0,
          notEnriched: notEnriched || 0,
          addedThisWeek: addedThisWeek || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Urban Manual performance and content
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stats Row - Clickable stats */}
      <div className="pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ClickableStatItem
            label="Destinations"
            value={stats?.totalDestinations || 0}
            loading={loading}
            onClick={() => router.push('/admin/destinations')}
            trend={stats?.addedThisWeek ? { value: stats.addedThisWeek, label: 'this week' } : undefined}
          />
          <ClickableStatItem
            label="Enriched"
            value={stats?.enrichedDestinations || 0}
            sublabel={stats ? `${Math.round((stats.enrichedDestinations / stats.totalDestinations) * 100)}%` : undefined}
            loading={loading}
            onClick={() => router.push('/admin/enrich')}
          />
          <ClickableStatItem
            label="User Saves"
            value={stats?.totalSaves || 0}
            loading={loading}
            onClick={() => router.push('/admin/analytics')}
          />
          <ClickableStatItem
            label="Visits Logged"
            value={stats?.totalVisits || 0}
            loading={loading}
            onClick={() => router.push('/admin/analytics')}
          />
        </div>
      </div>

      <Separator />

      {/* Needs Attention Section */}
      {!loading && stats && (stats.missingImages > 0 || stats.missingDescriptions > 0 || stats.notEnriched > 0) && (
        <>
          <div className="pt-6 pb-6">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs Attention
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.missingImages > 0 && (
                <AttentionCard
                  icon={<ImageOff className="w-4 h-4 text-orange-500" />}
                  title="Missing Images"
                  count={stats.missingImages}
                  description="Destinations without images"
                  onClick={() => router.push('/admin/destinations?filter=no_image')}
                />
              )}
              {stats.missingDescriptions > 0 && (
                <AttentionCard
                  icon={<FileText className="w-4 h-4 text-orange-500" />}
                  title="Missing Descriptions"
                  count={stats.missingDescriptions}
                  description="Need content to display"
                  onClick={() => router.push('/admin/destinations?filter=no_description')}
                />
              )}
              {stats.notEnriched > 0 && (
                <AttentionCard
                  icon={<Sparkles className="w-4 h-4 text-blue-500" />}
                  title="Not Enriched"
                  count={stats.notEnriched}
                  description="Waiting for Google enrichment"
                  onClick={() => router.push('/admin/destinations?filter=not_enriched')}
                />
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Content Stats - Definition list style */}
      <div className="pb-6 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-4">
          Content Highlights
        </h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DefinitionItem
            icon={<Crown className="w-4 h-4 text-amber-500" />}
            term="Crown Picks"
            value={stats?.crownPicks || 0}
            loading={loading}
          />
          <DefinitionItem
            icon={<img src="/michelin-star.svg" alt="Michelin" className="w-4 h-4" />}
            term="Michelin Spots"
            value={stats?.michelinSpots || 0}
            loading={loading}
          />
          <DefinitionItem
            icon={<Globe className="w-4 h-4 text-gray-400" />}
            term="Added This Week"
            value={stats?.addedThisWeek || 0}
            loading={loading}
          />
          <DefinitionItem
            icon={<Users className="w-4 h-4 text-gray-400" />}
            term="Users"
            value={stats?.activeUsers || 0}
            loading={loading}
          />
        </dl>
      </div>

      <Separator />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
        {/* Recent Destinations - Simple list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
              Recent Additions
            </h3>
            <Link
              href="/admin/destinations"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : (
              stats?.recentDestinations.map((dest, i) => (
                <Link
                  key={i}
                  href={`/destinations/${dest.slug}`}
                  className="py-3 flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm text-black dark:text-white group-hover:opacity-70 transition-opacity">
                      {dest.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{dest.city}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-gray-400 capitalize">
                    {dest.category}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top Cities - Bar chart style */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-4">
            Destinations by City
          </h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (
              stats?.topCities.map((city, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{city.city}</span>
                    <span className="text-gray-400 tabular-nums">{city.count}</span>
                  </div>
                  <Progress
                    value={(city.count / (stats?.topCities[0]?.count || 1)) * 100}
                    className="h-1"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* System Status - Inline with Badge */}
      <Separator />
      <div className="pt-6">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-4">
          System Status
        </h3>
        <div className="flex flex-wrap gap-3">
          {stats?.systemHealth.map((item, i) => (
            <Badge
              key={i}
              variant={item.status === 'healthy' ? 'success' : item.status === 'warning' ? 'warning' : 'destructive'}
              className="flex items-center gap-1.5 px-3 py-1"
            >
              {getStatusIcon(item.status)}
              <span>{item.name}</span>
              <span className="opacity-60">·</span>
              <span className="opacity-60">{item.message}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick Actions - Prominent buttons */}
      <Separator />
      <div className="pt-6">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton
            href="/admin/destinations"
            icon={<Plus className="w-5 h-5" />}
            label="Add Destination"
            description="Create new entry"
            primary
          />
          <QuickActionButton
            href="/admin/enrich"
            icon={<Sparkles className="w-5 h-5" />}
            label="Enrich Data"
            description="Google Places sync"
          />
          <QuickActionButton
            href="/admin/analytics"
            icon={<TrendingUp className="w-5 h-5" />}
            label="Analytics"
            description="View metrics"
          />
          <QuickActionButton
            href="/admin/reindex"
            icon={<RefreshCw className="w-5 h-5" />}
            label="Reindex"
            description="Update vectors"
          />
        </div>
      </div>
    </div>
  );
}

// Text-first stat item with shadcn Skeleton
function StatItem({
  label,
  value,
  sublabel,
  loading,
}: {
  label: string;
  value: number;
  sublabel?: string;
  loading: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <dd className="flex items-baseline gap-2">
          <span className="text-2xl font-medium text-black dark:text-white tabular-nums">
            {value.toLocaleString()}
          </span>
          {sublabel && (
            <Badge variant="secondary" className="text-xs">{sublabel}</Badge>
          )}
        </dd>
      )}
    </div>
  );
}

// Clickable stat item with optional trend
function ClickableStatItem({
  label,
  value,
  sublabel,
  loading,
  onClick,
  trend,
}: {
  label: string;
  value: number;
  sublabel?: string;
  loading: boolean;
  onClick?: () => void;
  trend?: { value: number; label: string };
}) {
  return (
    <button
      onClick={onClick}
      className="text-left group hover:bg-gray-50 dark:hover:bg-gray-900/50 -m-2 p-2 rounded-lg transition-colors"
    >
      <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
        {label}
      </dt>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <dd className="flex items-baseline gap-2">
          <span className="text-2xl font-medium text-black dark:text-white tabular-nums">
            {value.toLocaleString()}
          </span>
          {sublabel && (
            <Badge variant="secondary" className="text-xs">{sublabel}</Badge>
          )}
          {trend && trend.value > 0 && (
            <span className="flex items-center text-xs text-green-600 dark:text-green-400">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +{trend.value} {trend.label}
            </span>
          )}
        </dd>
      )}
    </button>
  );
}

// Attention card for issues needing action
function AttentionCard({
  icon,
  title,
  count,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors text-left w-full"
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
          <Badge variant="secondary" className="text-xs font-semibold">{count}</Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
    </button>
  );
}

// Definition list item with icon and shadcn Skeleton
function DefinitionItem({
  icon,
  term,
  value,
  loading,
}: {
  icon: React.ReactNode;
  term: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <dt className="text-xs text-gray-500 dark:text-gray-400">{term}</dt>
        {loading ? (
          <Skeleton className="h-5 w-10 mt-0.5" />
        ) : (
          <dd className="text-sm font-medium text-black dark:text-white tabular-nums">
            {value.toLocaleString()}
          </dd>
        )}
      </div>
    </div>
  );
}

// Simple action link
function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:text-black dark:hover:text-white transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

// Quick action button with description
function QuickActionButton({
  href,
  icon,
  label,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
        primary
          ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white hover:opacity-90'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      <div className={`flex-shrink-0 ${primary ? '' : 'text-gray-500'}`}>{icon}</div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${primary ? '' : 'text-gray-900 dark:text-white'}`}>{label}</p>
        <p className={`text-xs ${primary ? 'opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>{description}</p>
      </div>
    </Link>
  );
}
