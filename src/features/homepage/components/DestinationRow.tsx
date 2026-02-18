'use client';

import Image from 'next/image';
import { capitalizeCategory } from '@/lib/utils';
import { useHomepageData } from './HomepageDataProvider';

/**
 * DestinationRow - Horizontal scrolling preview of destinations
 *
 * Shows a curated row of destination cards before the full grid is revealed.
 */
export function DestinationRow() {
  const { destinations, openDestination } = useHomepageData();

  // Show first 12 destinations as a preview
  const previewDestinations = destinations.slice(0, 12);

  if (previewDestinations.length === 0) return null;

  return (
    <section className="w-full py-10">
      <div className="px-6 md:px-10 mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--editorial-text-tertiary)] mb-2">
          Featured Destinations
        </p>
        <h2
          className="text-xl font-normal tracking-[-0.02em] text-[var(--editorial-text-primary)]"
          style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
        >
          Recently added
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 md:px-10 pb-4">
        {previewDestinations.map((dest) => (
          <button
            key={dest.id || dest.slug}
            onClick={() => openDestination(dest)}
            className="flex-shrink-0 w-56 group text-left"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg mb-3 bg-[var(--editorial-border)]">
              {dest.image ? (
                <Image
                  src={dest.image_thumbnail || dest.image}
                  alt={dest.name}
                  fill
                  sizes="224px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--editorial-border)]" />
              )}
            </div>
            <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-accent)] transition-colors">
              {dest.name}
            </p>
            <p className="text-xs text-[var(--editorial-text-tertiary)] truncate">
              {dest.city} · {capitalizeCategory(dest.category)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
