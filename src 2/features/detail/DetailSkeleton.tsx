'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function DetailSkeleton() {
  return (
    <div className="pb-16">
      <div className="px-6 md:px-10 py-6">
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="h-8 w-80 mb-4" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="px-6 md:px-10">
        <div className="rounded-[32px] overflow-hidden border border-gray-200 dark:border-gray-800">
          <Skeleton className="aspect-[16/9]" />
        </div>
      </div>
      <div className="px-6 md:px-10 mt-8">
        <GridChipsSkeleton />
      </div>
      <div className="px-6 md:px-10 mt-10">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function GridChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-24" />
      ))}
    </div>
  );
}


