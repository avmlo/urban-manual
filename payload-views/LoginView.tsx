"use client";

export default function LoginView() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Urban Manual Admin
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
          Sign in with your admin account to access the CMS.
        </p>

        <a
          href="/account"
          style={{
            display: "inline-block",
            padding: "0.75rem 2rem",
            background: "#111",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Sign in via Supabase
        </a>

        <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "1.5rem" }}>
          You must have <strong>admin</strong> role in Supabase to access this panel.
          <br />
          After signing in, return to{" "}
          <a href="/admin" style={{ color: "#2563eb" }}>
            /admin
          </a>
          .
        </p>
      </div>
    </div>
  );
}
