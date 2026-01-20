'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ActivityLogFilters {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

interface LogActivityParams {
  action: string;
  entity_type: string;
  entity_id?: string | number;
  entity_name?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

// Query keys
export const activityKeys = {
  all: ['activity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: ActivityLogFilters) => [...activityKeys.lists(), filters] as const,
  entity: (entityType: string, entityId: string) =>
    [...activityKeys.all, 'entity', entityType, entityId] as const,
};

/**
 * Fetch activity logs with filters
 */
export function useActivityLogs(filters: ActivityLogFilters = {}) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.entity_type) params.set('entity_type', filters.entity_type);
      if (filters.entity_id) params.set('entity_id', filters.entity_id);
      if (filters.user_id) params.set('user_id', filters.user_id);
      if (filters.action) params.set('action', filters.action);
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.offset) params.set('offset', filters.offset.toString());

      const response = await fetch(`/api/admin/activity?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      return data as {
        logs: ActivityLog[];
        total: number;
        limit: number;
        offset: number;
      };
    },
  });
}

/**
 * Fetch activity logs for a specific entity
 */
export function useEntityActivity(entityType: string, entityId: string | null) {
  return useQuery({
    queryKey: activityKeys.entity(entityType, entityId!),
    queryFn: async () => {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId!,
        limit: '20',
      });

      const response = await fetch(`/api/admin/activity?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch entity activity');
      }

      const data = await response.json();
      return data.logs as ActivityLog[];
    },
    enabled: !!entityId,
  });
}

/**
 * Log an activity
 */
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActivityParams) => {
      const response = await fetch('/api/admin/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: params.action,
          entity_type: params.entity_type,
          entity_id: params.entity_id?.toString(),
          entity_name: params.entity_name,
          changes: params.changes,
          metadata: params.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log activity');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate activity logs to refetch
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Helper hook to log destination changes automatically
 */
export function useDestinationActivityLogger() {
  const { mutate: logActivity } = useLogActivity();

  return {
    logCreate: (destination: { id?: number; name: string }) => {
      logActivity({
        action: 'created',
        entity_type: 'destination',
        entity_id: destination.id,
        entity_name: destination.name,
      });
    },
    logUpdate: (
      destination: { id?: number; name: string },
      changes: Record<string, { old: unknown; new: unknown }>
    ) => {
      logActivity({
        action: 'updated',
        entity_type: 'destination',
        entity_id: destination.id,
        entity_name: destination.name,
        changes,
      });
    },
    logDelete: (destination: { id?: number; name: string }) => {
      logActivity({
        action: 'deleted',
        entity_type: 'destination',
        entity_id: destination.id,
        entity_name: destination.name,
      });
    },
    logPublish: (destination: { id?: number; name: string }) => {
      logActivity({
        action: 'published',
        entity_type: 'destination',
        entity_id: destination.id,
        entity_name: destination.name,
      });
    },
    logBulkUpdate: (count: number, action: string, metadata?: Record<string, unknown>) => {
      logActivity({
        action: 'bulk_update',
        entity_type: 'destination',
        metadata: {
          count,
          bulk_action: action,
          ...metadata,
        },
      });
    },
  };
}

/**
 * Format activity action for display
 */
export function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    published: 'Published',
    unpublished: 'Unpublished',
    bulk_update: 'Bulk Updated',
    enriched: 'Enriched',
    imported: 'Imported',
    exported: 'Exported',
  };

  return actionMap[action] || action;
}

/**
 * Get action color for badges
 */
export function getActivityActionColor(
  action: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (action) {
    case 'created':
    case 'published':
      return 'success';
    case 'updated':
    case 'enriched':
      return 'info';
    case 'deleted':
      return 'error';
    case 'bulk_update':
      return 'warning';
    default:
      return 'default';
  }
}
