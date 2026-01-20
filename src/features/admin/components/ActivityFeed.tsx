'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  useActivityLogs,
  formatActivityAction,
  getActivityActionColor,
} from '../hooks/useActivity';
import { Badge } from '@/ui/badge';
import { Skeleton } from '@/ui/skeleton';
import { ScrollArea } from '@/ui/scroll-area';
import { Clock, User } from 'lucide-react';

interface ActivityFeedProps {
  limit?: number;
  entityType?: string;
  entityId?: string;
  showUser?: boolean;
  className?: string;
}

export function ActivityFeed({
  limit = 20,
  entityType,
  entityId,
  showUser = true,
  className = '',
}: ActivityFeedProps) {
  const { data, isLoading, error } = useActivityLogs({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  });

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-2 h-2 rounded-full mt-2" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-destructive p-4 rounded-lg border border-destructive/20 ${className}`}>
        Failed to load activity feed
      </div>
    );
  }

  if (!data?.logs || data.logs.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-8 ${className}`}>
        No activity yet
      </div>
    );
  }

  return (
    <ScrollArea className={`h-[400px] pr-4 ${className}`}>
      <div className="space-y-4">
        {data.logs.map((log) => {
          const actionColor = getActivityActionColor(log.action);
          const colorClasses = {
            success: 'bg-admin-status-success-bg text-admin-status-success border-admin-status-success-border',
            warning: 'bg-admin-status-warning-bg text-admin-status-warning border-admin-status-warning-border',
            error: 'bg-admin-status-error-bg text-admin-status-error border-admin-status-error-border',
            info: 'bg-admin-status-info-bg text-admin-status-info border-admin-status-info-border',
            default: 'bg-muted text-muted-foreground border-border',
          };

          return (
            <div key={log.id} className="flex items-start gap-3 group">
              {/* Status indicator dot */}
              <div className={`w-2 h-2 rounded-full mt-2 ${actionColor === 'success' ? 'bg-admin-status-success' : actionColor === 'warning' ? 'bg-admin-status-warning' : actionColor === 'error' ? 'bg-admin-status-error' : actionColor === 'info' ? 'bg-admin-status-info' : 'bg-muted-foreground'}`} />

              <div className="flex-1 min-w-0">
                {/* Activity description */}
                <div className="flex items-start gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 ${colorClasses[actionColor]}`}
                  >
                    {formatActivityAction(log.action)}
                  </Badge>
                  <span className="text-sm font-medium">
                    {log.entity_name || log.entity_type}
                  </span>
                </div>

                {/* Changes preview */}
                {log.changes && Object.keys(log.changes).length > 0 && (
                  <div className="text-xs text-muted-foreground mb-1">
                    Changed: {Object.keys(log.changes).join(', ')}
                  </div>
                )}

                {/* Metadata */}
                {log.metadata && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {typeof log.metadata.count === 'number' && `${log.metadata.count} items`}
                    {typeof log.metadata.bulk_action === 'string' && ` - ${log.metadata.bulk_action}`}
                  </div>
                )}

                {/* User and time */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {showUser && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.user_email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Compact version for dashboard widgets
export function ActivityFeedCompact({ limit = 5, className = '' }: { limit?: number; className?: string }) {
  const { data, isLoading } = useActivityLogs({ limit });

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.logs || data.logs.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {data.logs.slice(0, limit).map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{formatActivityAction(log.action)}</span>
              <span className="text-xs text-muted-foreground truncate">
                {log.entity_name || log.entity_type}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {log.user_email.split('@')[0]} •{' '}
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
