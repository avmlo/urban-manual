"use client";

import { useEffect, useState } from "react";

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
}

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/analytics?range=30d");
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalDestinations: data.summary?.totalViews || 0,
            enrichedDestinations: 0,
            michelinSpots: 0,
            crownPicks: 0,
            totalSaves: data.summary?.totalSaves || 0,
            activeUsers: data.summary?.totalUsers || 0,
            missingImages: 0,
            missingDescriptions: 0,
            notEnriched: 0,
          });
        }
      } catch {
        // Silently handle — dashboard is non-critical
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        Urban Manual Dashboard
      </h2>
      {loading ? (
        <p style={{ color: "#666" }}>Loading stats...</p>
      ) : stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          <StatCard label="Total Saves" value={stats.totalSaves} />
          <StatCard label="Active Users" value={stats.activeUsers} />
          <StatCard label="Views (30d)" value={stats.totalDestinations} />
        </div>
      ) : (
        <p style={{ color: "#666" }}>
          Dashboard stats will be available once the analytics API is connected.
        </p>
      )}
      <div style={{ marginTop: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Quick Links
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ padding: "0.25rem 0" }}>
            <a href="/admin/collections/destinations" style={{ color: "#2563eb" }}>
              Manage Destinations
            </a>
          </li>
          <li style={{ padding: "0.25rem 0" }}>
            <a href="/admin/enrichment" style={{ color: "#2563eb" }}>
              Enrich Data
            </a>
          </li>
          <li style={{ padding: "0.25rem 0" }}>
            <a href="/admin/analytics" style={{ color: "#2563eb" }}>
              View Analytics
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "1.25rem",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>{value.toLocaleString()}</p>
    </div>
  );
}
