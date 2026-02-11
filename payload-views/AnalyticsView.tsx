"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  totalViews: number;
  totalSearches: number;
  totalSaves: number;
  totalUsers: number;
  viewsTrend: number;
  searchesTrend: number;
  savesTrend: number;
  usersTrend: number;
  topDestinations: { name: string; city: string; views: number }[];
  topSearches: { query: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  topCities: { city: string; count: number }[];
}

type DateRange = "7d" | "30d" | "90d";

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/analytics?range=${dateRange}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = await res.json();
        setData({
          totalViews: json.summary?.totalViews || 0,
          totalSearches: json.summary?.totalSearches || 0,
          totalSaves: json.summary?.totalSaves || 0,
          totalUsers: json.summary?.totalUsers || 0,
          viewsTrend: json.summary?.viewsTrend || 0,
          searchesTrend: json.summary?.searchesTrend || 0,
          savesTrend: json.summary?.savesTrend || 0,
          usersTrend: json.summary?.usersTrend || 0,
          topDestinations: json.topDestinations || [],
          topSearches: json.topSearches || [],
          categoryBreakdown: json.categoryBreakdown || [],
          topCities: json.topCities || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [dateRange]);

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Analytics</h2>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(["7d", "30d", "90d"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: dateRange === range ? "#111" : "#fff",
                color: dateRange === range ? "#fff" : "#111",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#666" }}>Loading analytics...</p>
      ) : data ? (
        <>
          {/* Summary metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            <MetricCard label="Views" value={data.totalViews} trend={data.viewsTrend} />
            <MetricCard label="Searches" value={data.totalSearches} trend={data.searchesTrend} />
            <MetricCard label="Saves" value={data.totalSaves} trend={data.savesTrend} />
            <MetricCard label="Users" value={data.totalUsers} trend={data.usersTrend} />
          </div>

          {/* Two column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Top destinations */}
            <div>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Top Destinations</h3>
              {data.topDestinations.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No data yet</p>
              ) : (
                data.topDestinations.slice(0, 10).map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #f3f4f6",
                      fontSize: "0.875rem",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                      <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>{d.city}</span>
                    </div>
                    <span style={{ color: "#6b7280" }}>{d.views} views</span>
                  </div>
                ))
              )}
            </div>

            {/* Top searches */}
            <div>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Top Searches</h3>
              {data.topSearches.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No data yet</p>
              ) : (
                data.topSearches.slice(0, 10).map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #f3f4f6",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span>{s.query}</span>
                    <span style={{ color: "#6b7280" }}>{s.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: number; trend: number }) {
  const trendColor = trend > 0 ? "#16a34a" : trend < 0 ? "#dc2626" : "#6b7280";
  const trendPrefix = trend > 0 ? "+" : "";

  return (
    <div style={{ padding: "1.25rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
      <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>
        {value.toLocaleString()}
      </p>
      {trend !== 0 && (
        <p style={{ fontSize: "0.75rem", color: trendColor }}>
          {trendPrefix}{trend.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
