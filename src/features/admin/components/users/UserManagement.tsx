'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  MoreVertical,
  Mail,
  Calendar,
  MapPin,
  Bookmark,
  Eye,
  Crown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  UserPlus,
  Ban,
  Loader2,
  AlertCircle,
} from 'lucide-react';

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

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    adminUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const ITEMS_PER_PAGE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }

      const data = await response.json();

      setUsers(data.users);
      setStats(data.stats);
      setTotalCount(data.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Stats - Matches design system */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-light mb-1">{stats.totalUsers.toLocaleString()}</div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)]">Total Users</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-light mb-1">{stats.activeUsers.toLocaleString()}</div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)]">Active (7d)</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-light mb-1">{stats.newUsersThisMonth.toLocaleString()}</div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)]">New This Month</div>
        </div>
        <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
          {loading ? (
            <div className="h-8 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
          ) : (
            <div className="text-2xl font-light mb-1">{stats.adminUsers.toLocaleString()}</div>
          )}
          <div className="text-xs text-[var(--editorial-text-secondary)]">Admins</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/10">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--editorial-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-[var(--editorial-border)] rounded-lg text-sm placeholder-[var(--editorial-text-tertiary)] focus:outline-none focus:border-[var(--editorial-border)]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-transparent border border-[var(--editorial-border)] rounded-md text-sm text-[var(--editorial-text-primary)] focus:outline-none focus:border-[var(--editorial-border)]"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="divide-y divide-[var(--editorial-border-subtle)]">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--editorial-border-subtle)] rounded-full animate-pulse" />
                <div>
                  <div className="h-4 w-32 bg-[var(--editorial-border-subtle)] rounded animate-pulse mb-1" />
                  <div className="h-3 w-40 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-16 bg-[var(--editorial-border-subtle)] rounded animate-pulse" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[var(--editorial-text-secondary)]">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--editorial-border-subtle)] flex items-center justify-center flex-shrink-0">
                  {user.user_metadata.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.email}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-[var(--editorial-text-secondary)]">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.user_metadata.full_name || user.email.split('@')[0]}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--editorial-text-secondary)]">
                    <span className="truncate">{user.email}</span>
                    {user.app_metadata.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--editorial-border-subtle)] rounded-md text-xs font-medium">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4 text-xs text-[var(--editorial-text-secondary)]">
                  <div className="flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{user.saved_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{user.visited_count}</span>
                  </div>
                  <span className={`${
                    user.last_sign_in_at && new Date(user.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ? 'text-[var(--editorial-text-primary)]'
                      : ''
                  }`}>
                    {getTimeAgo(user.last_sign_in_at)}
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                    className="p-1.5 rounded-full text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeDropdown === user.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveDropdown(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] shadow-lg z-20 py-2 overflow-hidden">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors">
                          <Mail className="w-4 h-4" />
                          Send Email
                        </button>
                        {user.app_metadata.role !== 'admin' && (
                          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] transition-colors">
                            <Crown className="w-4 h-4" />
                            Make Admin
                          </button>
                        )}
                        <div className="my-1 border-t border-[var(--editorial-border)]" />
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                          <Ban className="w-4 h-4" />
                          Suspend User
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-full text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--editorial-text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-full text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)] disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg bg-[var(--editorial-bg-elevated)] rounded-lg overflow-hidden border border-[var(--editorial-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--editorial-border-subtle)] flex items-center justify-center">
                  {selectedUser.user_metadata.avatar_url ? (
                    <img
                      src={selectedUser.user_metadata.avatar_url}
                      alt={selectedUser.email}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-medium text-[var(--editorial-text-secondary)]">
                      {selectedUser.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-light">
                    {selectedUser.user_metadata.full_name || selectedUser.email.split('@')[0]}
                  </h2>
                  <p className="text-sm text-[var(--editorial-text-secondary)]">{selectedUser.email}</p>
                  {selectedUser.app_metadata.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-[var(--editorial-border-subtle)] rounded-md text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
                  <p className="text-xs text-[var(--editorial-text-secondary)] mb-1">Saved Places</p>
                  <p className="text-2xl font-light">{selectedUser.saved_count}</p>
                </div>
                <div className="p-4 border border-[var(--editorial-border)] rounded-lg">
                  <p className="text-xs text-[var(--editorial-text-secondary)] mb-1">Visited</p>
                  <p className="text-2xl font-light">{selectedUser.visited_count}</p>
                </div>
              </div>

              <div className="mt-6 divide-y divide-[var(--editorial-border-subtle)]">
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-[var(--editorial-text-secondary)]">Joined</span>
                  <span className="text-sm">{formatDate(selectedUser.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-[var(--editorial-text-secondary)]">Last Active</span>
                  <span className="text-sm">{getTimeAgo(selectedUser.last_sign_in_at)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-[var(--editorial-text-secondary)]">Provider</span>
                  <span className="text-sm capitalize">{selectedUser.app_metadata.provider || 'email'}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--editorial-bg)] border-t border-[var(--editorial-border)] flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
              >
                Close
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] rounded-xl text-sm font-medium transition-colors hover:opacity-80">
                <Mail className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
