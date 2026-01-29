'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
      )}

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Specific empty state variants
export function NoResultsEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      title="No results found"
      description="Try adjusting your filters or search query to find what you're looking for."
      action={{
        label: 'Clear Filters',
        onClick: onReset,
      }}
    />
  );
}

export function NoDestinationsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No destinations yet"
      description="Start building your collection by adding your first destination."
      action={{
        label: 'Add Destination',
        onClick: onCreate,
      }}
    />
  );
}
