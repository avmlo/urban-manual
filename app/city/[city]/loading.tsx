import { DestinationGridSkeleton } from "@/ui/DestinationCardSkeleton";

export default function CityLoading() {
  return (
    <main className="relative min-h-screen dark:text-white">
      {/* City Header Skeleton */}
      <section className="px-6 md:px-10 py-10">
        <div className="max-w-[1800px] mx-auto">
          {/* City name */}
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
          {/* Subtitle */}
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-8" />

          {/* Category filters skeleton */}
          <div className="flex flex-wrap gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"
                style={{ width: `${60 + Math.random() * 40}px` }}
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
