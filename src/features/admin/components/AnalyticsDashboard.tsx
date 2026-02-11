"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { BarChart3, Search, Eye, MousePointerClick } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

  const loadAnalytics = useCallback(async () => {
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
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [loadAnalytics, user]);

  const baseWrapper = variant === "page" ? "space-y-8" : "space-y-6 text-sm";

  const LoadingState = (
    <div className="py-8 text-center text-sm text-[var(--editorial-text-secondary)]">
      Loading analytics…
    </div>
  );

  const EmptyState = (
    <div className="py-8 text-center text-sm text-[var(--editorial-text-secondary)]">
      Failed to load analytics
    </div>
  );

  const AuthState = (
    <div className="py-8 text-center text-sm text-[var(--editorial-text-secondary)]">
      Please sign in to view analytics
    </div>
  );

  if (!user) {
    return variant === "page" ? <div className={baseWrapper}>{AuthState}</div> : AuthState;
  }

  if (loading) {
    return variant === "page" ? <div className={baseWrapper}>{LoadingState}</div> : LoadingState;
  }

  if (!analytics) {
    return variant === "page" ? <div className={baseWrapper}>{EmptyState}</div> : EmptyState;
  }

  const statsList = [
    { label: "Searches", value: analytics.summary.totalSearches.toLocaleString(), icon: Search },
    { label: "Views", value: analytics.summary.totalViews.toLocaleString(), icon: Eye },
    {
      label: "CTR",
      value: `${(analytics.metrics.clickThroughRate * 100).toFixed(1)}%`,
      icon: MousePointerClick,
    },
    {
      label: "Discovery Engine",
      value: analytics.summary.discoveryEngineEnabled ? "Enabled" : "Disabled",
      icon: BarChart3,
    },
  ];

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="space-y-2">
      <p className="text-sm font-semibold text-[var(--editorial-text-primary)]">{title}</p>
      <div className="space-y-2 text-sm text-[var(--editorial-text-primary)]">{children}</div>
    </section>
  );

  return (
    <div className={baseWrapper}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--editorial-text-primary)]">Search Analytics</h1>
        <p className="text-sm text-[var(--editorial-text-secondary)]">
          Insights into search behavior and Discovery Engine performance
        </p>
      </div>

      <div className="flex flex-col gap-3 text-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--editorial-text-secondary)] mb-1">
            Start date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full border border-[var(--editorial-border)] bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--editorial-text-secondary)] mb-1">
            End date
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full border border-[var(--editorial-border)] bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <Section title="Summary">
        <dl className="space-y-1">
          {statsList.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-[var(--editorial-border-subtle)] pb-1"
            >
              <div className="flex items-center gap-2 text-[var(--editorial-text-secondary)]">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              <span className="font-mono text-[var(--editorial-text-primary)]">{value}</span>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Popular search queries">
        {analytics.popularQueries.length === 0 ? (
          <p className="text-[var(--editorial-text-secondary)]">No search queries recorded for this range.</p>
        ) : (
          <ul className="space-y-1">
            {analytics.popularQueries.slice(0, 10).map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between border-b border-[var(--editorial-border-subtle)] pb-1"
              >
                <span>{item.query}</span>
                <span className="font-mono">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Popular destinations">
        {analytics.popularDestinations.length === 0 ? (
          <p className="text-[var(--editorial-text-secondary)]">No destination interactions recorded.</p>
        ) : (
          <ul className="space-y-1">
            {analytics.popularDestinations.slice(0, 10).map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between border-b border-[var(--editorial-border-subtle)] pb-1"
              >
                <span>{item.slug}</span>
                <span className="font-mono">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Search trends">
        {analytics.searchTrends.slice(-10).map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between border-b border-[var(--editorial-border-subtle)] pb-1"
          >
            <span className="text-[var(--editorial-text-secondary)]">{item.date}</span>
            <span className="font-mono">{item.count}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
