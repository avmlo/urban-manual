"use client";

export default function DiscoverView() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
        Discover Feed Curation
      </h2>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Curate the Discover feed by selecting featured destinations. Use the Destinations
        collection to mark destinations with the &quot;crown&quot; flag to feature them in the discover feed.
      </p>

      <div style={{ padding: "1.5rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          How to curate
        </h3>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", color: "#374151", lineHeight: 1.8 }}>
          <li>Go to the <a href="/admin/collections/destinations" style={{ color: "#2563eb" }}>Destinations</a> collection</li>
          <li>Edit a destination and toggle the <strong>Crown</strong> checkbox in the Details tab</li>
          <li>Crown destinations will be featured prominently in the Discover feed</li>
          <li>Use the <strong>tags</strong> field to categorize destinations for themed collections</li>
        </ol>
      </div>
    </div>
  );
}
