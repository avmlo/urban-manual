'use client';

/**
 * TripSkeleton - Skeleton loader matching the trip editor layout
 * Shows while trip data is loading. Mirrors the actual panel structure
 * for smooth perceived performance.
 */
export default function TripSkeleton() {
  return (
    <main className="h-[calc(100dvh-84px)] md:h-[calc(100dvh-100px)] overflow-hidden bg-[var(--editorial-bg)]">
      <div className="flex h-full">
        {/* LEFT PANEL skeleton */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col lg:border-r border-[var(--editorial-border)] bg-[var(--editorial-bg)]">
          {/* Toolbar skeleton */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--editorial-border)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--editorial-border)] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-[var(--editorial-border)] animate-pulse" />
              <div className="h-3 w-20 rounded bg-[var(--editorial-border-subtle)] animate-pulse" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--editorial-border)] animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-[var(--editorial-border)] animate-pulse" />
            </div>
          </div>

          {/* Tab bar skeleton */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--editorial-border)]/50">
            <div className="h-7 w-16 rounded-full bg-[var(--editorial-text-primary)] animate-pulse" />
            <div className="h-7 w-14 rounded-full bg-[var(--editorial-border)] animate-pulse" />
            <div className="h-7 w-12 rounded-full bg-[var(--editorial-border)] animate-pulse" />
          </div>

          {/* Day sections skeleton */}
          <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
            {[1, 2, 3].map((day) => (
              <div key={day} className="mb-6">
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--editorial-border)] animate-pulse" />
                  <div className="h-4 w-16 rounded bg-[var(--editorial-border)] animate-pulse" />
                  <div className="h-6 w-14 rounded-full bg-[var(--editorial-border-subtle)] animate-pulse" />
                </div>
                {/* Item rows */}
                {Array.from({ length: day === 1 ? 4 : day === 2 ? 3 : 2 }).map((_, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)]">
                      <div className="w-14 h-6 rounded-lg bg-[var(--editorial-border)] animate-pulse" />
                      <div className="w-7 h-7 rounded-lg bg-[var(--editorial-border)] animate-pulse" />
                      <div className="flex-1 h-4 rounded bg-[var(--editorial-border)] animate-pulse" />
                      <div className="w-4 h-4 rounded bg-[var(--editorial-border-subtle)] animate-pulse" />
                    </div>
                    {/* Travel time connector skeleton */}
                    {i < (day === 1 ? 3 : day === 2 ? 2 : 1) && (
                      <div className="flex justify-center py-1">
                        <div className="h-3 w-16 rounded bg-[var(--editorial-border-subtle)] animate-pulse" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - Map skeleton (desktop only) */}
        <div className="hidden lg:flex flex-1 relative bg-[var(--editorial-border-subtle)]">
          {/* Map placeholder with subtle shimmer */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[var(--editorial-border-subtle)] to-[var(--editorial-border)]" />
          {/* Floating toolbar skeleton */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 glass-control rounded-lg p-1">
            <div className="w-16 h-7 rounded-md bg-[var(--editorial-border)] animate-pulse" />
            <div className="w-16 h-7 rounded-md bg-[var(--editorial-border)] animate-pulse" />
          </div>
          {/* Center loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-control rounded-xl px-6 py-4 flex items-center gap-3">
              <div className="relative w-8 h-8">
                {/* Dual spinner inspired by itskovacs/trip */}
                <div className="absolute inset-0 rounded-full border-2 border-[var(--editorial-border)] border-t-[var(--editorial-accent)] animate-spin" />
                <div className="absolute inset-1 rounded-full border-2 border-[var(--editorial-border-subtle)] border-b-[var(--editorial-text-tertiary)]" style={{ animation: 'spin 3s linear infinite' }} />
              </div>
              <span className="text-sm text-[var(--editorial-text-secondary)]">Loading trip...</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
