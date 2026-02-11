"use client";

import { useState, useEffect, useCallback } from "react";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: {
    role?: string;
    provider?: string;
  };
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
  };
  saved_count: number;
  visited_count: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  adminUsers: number;
}

export default function UserManagementView() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        User Management
      </h2>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Users</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.totalUsers}</p>
          </div>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Active This Week</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.activeUsers}</p>
          </div>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>New This Month</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.newUsersThisMonth}</p>
          </div>
          <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Admins</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>{stats.adminUsers}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "0.875rem",
          }}
        />
      </form>

      {/* User list */}
      {loading ? (
        <p style={{ color: "#666" }}>Loading users...</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Role</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Saves</th>
                <th style={{ textAlign: "right", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Visits</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 500 }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>{user.email}</td>
                  <td style={{ padding: "0.75rem 0.5rem", color: "#6b7280" }}>
                    {user.user_metadata?.full_name || "-"}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span
                      style={{
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        background: user.app_metadata?.role === "admin" ? "#dbeafe" : "#f3f4f6",
                        color: user.app_metadata?.role === "admin" ? "#2563eb" : "#6b7280",
                      }}
                    >
                      {user.app_metadata?.role || "user"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{user.saved_count}</td>
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>{user.visited_count}</td>
                  <td style={{ padding: "0.75rem 0.5rem", color: "#6b7280" }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
                fontSize: "0.875rem",
              }}
            >
              Previous
            </button>
            <span style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                fontSize: "0.875rem",
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
