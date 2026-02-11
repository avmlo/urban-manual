"use client";

import { useState } from "react";

export default function SettingsView() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>Settings</h2>

      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Global site settings are managed through the Payload CMS globals system.
        Use the Site Settings global in the sidebar to configure homepage layout,
        featured content, and other site-wide options.
      </p>

      <div style={{ padding: "1.5rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ padding: "0.5rem 0" }}>
            <a href="/admin/collections/admins" style={{ color: "#2563eb", fontSize: "0.875rem" }}>
              Manage Admin Users
            </a>
          </li>
          <li style={{ padding: "0.5rem 0" }}>
            <a href="/admin/globals/site-settings" style={{ color: "#2563eb", fontSize: "0.875rem" }}>
              Edit Site Settings
            </a>
          </li>
        </ul>
      </div>

      {saved && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: "6px", fontSize: "0.875rem", color: "#16a34a" }}>
          Settings saved successfully
        </div>
      )}
    </div>
  );
}
