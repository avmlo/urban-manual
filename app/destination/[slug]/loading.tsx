export default function DestinationLoading() {
  return (
    <main className="relative min-h-screen dark:text-white">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
        {/* Hero image skeleton */}
        <div className="w-full aspect-[16/10] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-8" />

        {/* Title skeleton */}
        <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-3" />
        {/* Subtitle / meta info */}
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />

        {/* Action buttons skeleton */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-3 mb-8">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Details grid skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Map skeleton */}
        <div className="w-full h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-8" />

        {/* Related destinations skeleton */}
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
