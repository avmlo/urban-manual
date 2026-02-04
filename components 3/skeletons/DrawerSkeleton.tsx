/**
 * Skeleton loading component for destination drawer
 * Shows while drawer content is loading
 */
export function DrawerSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-gray-200 dark:bg-gray-800">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Content skeleton */}
      <div className="px-6 pt-6 space-y-6">
        {/* Title */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Meta info */}
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>

        {/* Map placeholder */}
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="flex gap-4 overflow-x-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-40">
                <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
