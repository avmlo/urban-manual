"use client";

import { useState } from "react";

export default function ReindexView() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const triggerReindex = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/reindex-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Reindex failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
        Search Reindexing
      </h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Reindex all destinations in the vector search index. This ensures search results
        are up to date with the latest content changes.
      </p>

      <button
        onClick={triggerReindex}
        disabled={loading}
        style={{
          padding: "0.625rem 1.5rem",
          borderRadius: "6px",
          background: loading ? "#9ca3af" : "#2563eb",
          color: "#fff",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        {loading ? "Reindexing..." : "Start Reindex"}
      </button>

      {result && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "8px",
            background: result.error ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${result.error ? "#fecaca" : "#bbf7d0"}`,
          }}
        >
          <p style={{ fontSize: "0.875rem", color: result.error ? "#dc2626" : "#16a34a" }}>
            {result.error || result.message || "Reindex complete"}
          </p>
        </div>
      )}
    </div>
  );
}
