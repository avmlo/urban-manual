'use client';

import { GridSkeleton, Skeleton } from '@/src/ui/Skeleton';

export default function SearchGridSkeleton() {
  return (
    <div className="px-6 md:px-10 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-24" />
      </div>
      <GridSkeleton items={6} />
    </div>
  );
}


