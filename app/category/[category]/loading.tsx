import { DestinationGridSkeleton } from "@/ui/DestinationCardSkeleton";

export default function CategoryLoading() {
  return (
    <main className="relative min-h-screen dark:text-white">
      <section className="px-6 md:px-10 py-10">
        <div className="max-w-[1800px] mx-auto">
          {/* Category name */}
          <div className="h-8 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
          {/* Subtitle */}
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-8" />

          {/* City filter pills skeleton */}
          <div className="flex flex-wrap gap-3 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-9 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"
                style={{ width: `${50 + Math.random() * 50}px` }}
              />
            ))}
          </div>

          {/* Grid Skeleton */}
          <DestinationGridSkeleton count={16} />
        </div>
      </section>
    </main>
  );
}
