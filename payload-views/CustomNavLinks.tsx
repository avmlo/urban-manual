import React from "react";

const links = [
  { href: "/admin/enrichment", label: "Enrichment" },
  { href: "/admin/analytics-view", label: "Analytics" },
  { href: "/admin/user-management", label: "Users" },
  { href: "/admin/reindex", label: "Reindex" },
  { href: "/admin/discover", label: "Discover" },
  { href: "/admin/settings-view", label: "Settings" },
];

export default function CustomNavLinks() {
  return (
    <div style={{ borderTop: "1px solid var(--theme-elevation-150)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
      <p
        style={{
          fontSize: "0.625rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--theme-elevation-500)",
          padding: "0.5rem 1rem 0.25rem",
          fontWeight: 600,
        }}
      >
        Tools
      </p>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{
            display: "block",
            padding: "0.375rem 1rem",
            fontSize: "0.8125rem",
            color: "var(--theme-elevation-800)",
            textDecoration: "none",
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
