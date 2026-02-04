'use client';

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-800 ${className}`} />
  );
}

export function GridSkeleton({
  items = 6,
  aspect = 'aspect-square',
}: {
  items?: number;
  aspect?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className={`${aspect} rounded-2xl bg-gray-200 dark:bg-gray-800`} />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}


