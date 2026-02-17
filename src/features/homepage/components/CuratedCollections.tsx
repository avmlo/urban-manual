'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface CuratedCollection {
  slug: string;
  title: string;
  subtitle: string;
  coverImage: string | null;
}

export function CuratedCollections() {
  const [collections, setCollections] = useState<CuratedCollection[]>([]);

  useEffect(() => {
    fetch('/api/collections/curated')
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []))
      .catch(() => {});
  }, []);

  if (collections.length === 0) return null;

  return (
    <section className="w-full px-6 md:px-10 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--editorial-text-tertiary)] mb-2">
            Curated Journeys
          </p>
          <h2
            className="text-2xl font-normal tracking-[-0.02em] text-[var(--editorial-text-primary)]"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            Collections worth exploring
          </h2>
        </div>
        <a
          href="/cities"
          className="text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {collections.map((collection) => (
          <a
            key={collection.slug}
            href={`/cities?collection=${collection.slug}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-lg"
          >
            {collection.coverImage ? (
              <Image
                src={collection.coverImage}
                alt={collection.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-[var(--editorial-border)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3
                className="text-sm font-medium text-white mb-1"
                style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
              >
                {collection.title}
              </h3>
              <p className="text-xs text-white/70">{collection.subtitle}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
