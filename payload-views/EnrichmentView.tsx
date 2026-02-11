"use client";

import { useState, useEffect, useCallback } from "react";

interface EnrichmentStats {
  total: number;
  enriched: number;
  notEnriched: number;
}

interface EnrichmentResult {
  success?: boolean;
  slug?: string;
  message?: string;
  error?: string;
}

export default function EnrichmentView() {
  const [slug, setSlug] = useState("");
  const [output, setOutput] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [batchMode, setBatchMode] = useState<"single" | "batch">("single");
  const [batchSize, setBatchSize] = useState(10);
  const [batchFilter, setBatchFilter] = useState<"not-enriched" | "all" | "city">("not-enriched");
  const [batchCity, setBatchCity] = useState("");
  const [batchResults, setBatchResults] = useState<EnrichmentResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics?range=30d");
      if (res.ok) {
        const data = await res.json();
        setStats({
          total: data.summary?.totalViews || 0,
          enriched: 0,
          notEnriched: 0,
        });
      }
    } catch {
      // Stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const enrichSingle = async () => {
    if (!slug.trim()) return;
    setLoading(true);
    setOutput(null);
    try {
      const res = await fetch("/api/enrich-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim() }),
      });
      const data = await res.json();
      setOutput(data);
    } catch (err) {
      setOutput({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const enrichBatch = async () => {
    setBatchRunning(true);
    setBatchResults([]);
    setBatchProgress(0);

    try {
      const params = new URLSearchParams({
        limit: String(batchSize),
        filter: batchFilter,
      });
      if (batchFilter === "city" && batchCity) {
        params.set("city", batchCity);
      }

      const res = await fetch(`/api/enrich-google?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true, batchSize, filter: batchFilter, city: batchCity }),
      });
      const data = await res.json();

      if (Array.isArray(data.results)) {
        setBatchResults(data.results);
        setBatchProgress(100);
      } else {
        setBatchResults([{ success: data.success, message: data.message || "Batch complete" }]);
        setBatchProgress(100);
      }
    } catch (err) {
      setBatchResults([{ error: err instanceof Error ? err.message : "Batch failed" }]);
    } finally {
      setBatchRunning(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        Data Enrichment
      </h2>

      {/* Stats */}
      {statsLoading ? (
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>Loading enrichment stats...</p>
      ) : stats ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.total}</p>
          </div>
          <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#16a34a" }}>Enriched</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.enriched}</p>
          </div>
          <div style={{ padding: "1rem", background: "#fef3c7", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#d97706" }}>Not Enriched</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.notEnriched}</p>
          </div>
        </div>
      ) : null}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setBatchMode("single")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: batchMode === "single" ? "#111" : "#fff",
            color: batchMode === "single" ? "#fff" : "#111",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Single
        </button>
        <button
          onClick={() => setBatchMode("batch")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: batchMode === "batch" ? "#111" : "#fff",
            color: batchMode === "batch" ? "#fff" : "#111",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Batch
        </button>
      </div>

      {batchMode === "single" ? (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Enter destination slug..."
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enrichSingle()}
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={enrichSingle}
              disabled={loading || !slug.trim()}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                background: loading ? "#9ca3af" : "#2563eb",
                color: "#fff",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {loading ? "Enriching..." : "Enrich"}
            </button>
          </div>

          {output && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: output.error ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${output.error ? "#fecaca" : "#bbf7d0"}`,
                marginTop: "1rem",
              }}
            >
              <pre style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap", margin: 0 }}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "end", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
                Filter
              </label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value as "not-enriched" | "all" | "city")}
                style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.875rem" }}
              >
                <option value="not-enriched">Not Enriched</option>
                <option value="all">All</option>
                <option value="city">By City</option>
              </select>
            </div>
            {batchFilter === "city" && (
              <div>
                <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
                  City
                </label>
                <input
                  type="text"
                  value={batchCity}
                  onChange={(e) => setBatchCity(e.target.value)}
                  placeholder="e.g. London"
                  style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.875rem" }}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: "0.25rem" }}>
                Batch Size
              </label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.875rem" }}
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={enrichBatch}
              disabled={batchRunning}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                background: batchRunning ? "#9ca3af" : "#2563eb",
                color: "#fff",
                border: "none",
                cursor: batchRunning ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {batchRunning ? `Running... ${batchProgress}%` : "Start Batch"}
            </button>
          </div>

          {batchResults.length > 0 && (
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                maxHeight: "400px",
                overflow: "auto",
                marginTop: "1rem",
              }}
            >
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                {batchResults.length} result(s)
              </p>
              {batchResults.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "0.75rem",
                  }}
                >
                  {r.slug && <strong>{r.slug}: </strong>}
                  {r.success ? "Success" : r.error || r.message || "Unknown"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
