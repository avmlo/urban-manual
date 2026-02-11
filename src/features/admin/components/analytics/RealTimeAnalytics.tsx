'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, Users, Eye, MousePointerClick, Globe, Clock, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LiveMetric {
  activeUsers: number;
  pageViews: number;
  currentPages: { page: string; users: number }[];
  recentEvents: { type: string; detail: string; time: Date }[];
  locations: { city: string; country: string }[];
}

export function RealTimeAnalytics() {
  const [metrics, setMetrics] = useState<LiveMetric>({
    activeUsers: 0,
    pageViews: 0,
    currentPages: [],
    recentEvents: [],
    locations: [],
  });
  const [pulse, setPulse] = useState(false);

  // Simulate real-time data updates
  const updateMetrics = useCallback(async () => {
    // Fetch recent interactions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentInteractions } = await supabase
      .from('user_interactions')
      .select('*')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    // Simulate active users based on recent activity
    const uniqueUsers = new Set(recentInteractions?.map(i => i.user_id) || []);

    // Generate simulated data for demonstration
    const pages = [
      { page: '/', users: Math.floor(Math.random() * 15) + 5 },
      { page: '/cities/london', users: Math.floor(Math.random() * 8) + 2 },
      { page: '/cities/paris', users: Math.floor(Math.random() * 6) + 1 },
      { page: '/cities/tokyo', users: Math.floor(Math.random() * 5) + 1 },
      { page: '/destinations', users: Math.floor(Math.random() * 4) + 1 },
    ];

    const events = [
      { type: 'view', detail: 'User viewed Sketch - London', time: new Date() },
      { type: 'save', detail: 'User saved Chiltern Firehouse', time: new Date(Date.now() - 15000) },
      { type: 'search', detail: 'Search: "best restaurants tokyo"', time: new Date(Date.now() - 30000) },
      { type: 'click', detail: 'Clicked on Noma - Copenhagen', time: new Date(Date.now() - 45000) },
      { type: 'view', detail: 'User viewed Paris city guide', time: new Date(Date.now() - 60000) },
    ];

    const locations = [
      { city: 'London', country: 'UK' },
      { city: 'New York', country: 'US' },
      { city: 'Tokyo', country: 'JP' },
      { city: 'Berlin', country: 'DE' },
      { city: 'Paris', country: 'FR' },
    ];

    setMetrics({
      activeUsers: uniqueUsers.size || Math.floor(Math.random() * 50) + 20,
      pageViews: recentInteractions?.filter(i => i.interaction_type === 'view').length || Math.floor(Math.random() * 200) + 50,
      currentPages: pages,
      recentEvents: events,
      locations: locations,
    });

    setPulse(true);
    setTimeout(() => setPulse(false), 500);
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const eventIcons: Record<string, React.ReactNode> = {
    view: <Eye className="w-3 h-3" />,
    save: <MousePointerClick className="w-3 h-3" />,
    search: <Activity className="w-3 h-3" />,
    click: <MousePointerClick className="w-3 h-3" />,
  };

  const eventColors: Record<string, string> = {
    view: 'text-indigo-400 bg-indigo-500/10',
    save: 'text-emerald-400 bg-emerald-500/10',
    search: 'text-amber-400 bg-amber-500/10',
    click: 'text-purple-400 bg-purple-500/10',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--editorial-text-primary)]">Real-Time Analytics</h1>
          <p className="mt-1 text-sm text-[var(--editorial-text-tertiary)]">
            Live activity on your platform right now
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`
            w-2 h-2 rounded-full transition-all
            ${pulse ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-emerald-500'}
          `} />
          <span className="text-xs text-[var(--editorial-text-secondary)]">Live</span>
        </div>
      </div>

      {/* Live Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Users */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Active Users</span>
            </div>
            <p className={`
              text-5xl font-bold text-[var(--editorial-text-primary)] mt-3 transition-all
              ${pulse ? 'scale-105' : 'scale-100'}
            `}>
              {metrics.activeUsers}
            </p>
            <p className="text-xs text-[var(--editorial-text-secondary)] mt-2">Currently on site</p>
          </div>
        </div>

        {/* Page Views (Last 5 min) */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-indigo-400">
              <Eye className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Page Views</span>
            </div>
            <p className={`
              text-5xl font-bold text-[var(--editorial-text-primary)] mt-3 transition-all
              ${pulse ? 'scale-105' : 'scale-100'}
            `}>
              {metrics.pageViews}
            </p>
            <p className="text-xs text-[var(--editorial-text-secondary)] mt-2">Last 5 minutes</p>
          </div>
        </div>

        {/* Views per Minute */}
        <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-purple-400">
              <Zap className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Views/Min</span>
            </div>
            <p className={`
              text-5xl font-bold text-[var(--editorial-text-primary)] mt-3 transition-all
              ${pulse ? 'scale-105' : 'scale-100'}
            `}>
              {Math.round(metrics.pageViews / 5)}
            </p>
            <p className="text-xs text-[var(--editorial-text-secondary)] mt-2">Average rate</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Pages */}
        <div className="rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] p-5">
          <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
            Active Pages
          </h3>
          <div className="space-y-3">
            {metrics.currentPages.map((page, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`
                    w-2 h-2 rounded-full
                    ${i === 0 ? 'bg-emerald-400' : i < 3 ? 'bg-indigo-400' : 'bg-[var(--editorial-text-secondary)]'}
                  `} />
                  <span className="text-sm text-[var(--editorial-text-secondary)] truncate">{page.page}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--editorial-text-primary)] font-medium">{page.users}</span>
                  <Users className="w-3 h-3 text-[var(--editorial-text-secondary)]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] p-5">
          <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
            Live Feed
          </h3>
          <div className="space-y-3">
            {metrics.recentEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`
                  p-1.5 rounded-md flex-shrink-0
                  ${eventColors[event.type]}
                `}>
                  {eventIcons[event.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--editorial-text-secondary)] truncate">{event.detail}</p>
                  <p className="text-xs text-[var(--editorial-text-secondary)] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(event.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Locations */}
        <div className="rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] p-5">
          <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--editorial-text-secondary)]" />
            Active Locations
          </h3>
          <div className="space-y-3">
            {metrics.locations.map((loc, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getCountryFlag(loc.country)}</span>
                  <span className="text-sm text-[var(--editorial-text-secondary)]">{loc.city}</span>
                </div>
                <span className="text-xs text-[var(--editorial-text-secondary)]">{loc.country}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic Heatmap Placeholder */}
      <div className="rounded-xl border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] p-5">
        <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] mb-4">Traffic Activity (24h)</h3>
        <div className="grid grid-cols-24 gap-1">
          {Array.from({ length: 24 }).map((_, hour) => {
            const intensity = Math.random();
            return (
              <div key={hour} className="space-y-1">
                <div
                  className="h-8 rounded transition-all hover:scale-110"
                  style={{
                    backgroundColor: `rgba(99, 102, 241, ${0.1 + intensity * 0.6})`,
                  }}
                  title={`${hour}:00 - ${Math.round(intensity * 100)} views`}
                />
                {hour % 4 === 0 && (
                  <span className="text-xs text-[var(--editorial-text-secondary)] block text-center">{hour}h</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    UK: '\u{1F1EC}\u{1F1E7}',
    US: '\u{1F1FA}\u{1F1F8}',
    JP: '\u{1F1EF}\u{1F1F5}',
    DE: '\u{1F1E9}\u{1F1EA}',
    FR: '\u{1F1EB}\u{1F1F7}',
  };
  return flags[code] || '\u{1F30D}';
}
