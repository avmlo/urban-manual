'use client';

import { useEffect, useState } from 'react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/track';

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  rating?: number;
  price_level?: number;
  michelin_stars?: number;
  match_score?: number;
  label?: string;
}

export function RelatedDestinations({ destinationId }: { destinationId: string }) {
  const [similar, setSimilar] = useState<Destination[]>([]);
  const [complementary, setComplementary] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/similar/${destinationId}`)
      .then(res => res.json())
      .then(data => {
        setSimilar(data.similar || []);
        setComplementary(data.complementary || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [destinationId]);

  if (loading || (!similar.length && !complementary.length)) return null;

  return (
    <div className="space-y-12 mt-12">
      {similar.length > 0 && (
        <section>
          <h3 className="text-sm tracking-wide uppercase text-neutral-500 mb-4">
            Similar Vibe
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {similar.map((dest) => (
              <a
                key={dest.id}
                href={`/destination/${dest.slug}`}
                className={CARD_WRAPPER}
                onClick={() => {
                  trackEvent({
                    event_type: 'click',
                    destination_id: dest.id,
                    destination_slug: dest.slug,
                    metadata: {
                      category: dest.category,
                      city: dest.city,
                      source: 'related_similar_vibe',
                      relation_type: 'similar',
                      match_score: dest.match_score,
                    },
                  });
                }}
              >
                <div className={CARD_MEDIA}>
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  {dest.michelin_stars && dest.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <span>⭐</span>
                      <span>{dest.michelin_stars}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className={CARD_TITLE}>{dest.name}</div>
                  <div className={CARD_META}>
                    {dest.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {dest.city}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {complementary.length > 0 && (
        <section>
          <h3 className="text-sm tracking-wide uppercase text-neutral-500 mb-4">
            Pair With
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {complementary.map((dest) => (
              <a
                key={dest.id}
                href={`/destination/${dest.slug}`}
                className={CARD_WRAPPER}
                onClick={() => {
                  trackEvent({
                    event_type: 'click',
                    destination_id: dest.id,
                    destination_slug: dest.slug,
                    metadata: {
                      category: dest.category,
                      city: dest.city,
                      source: 'related_pair_with',
                      relation_type: 'complementary',
                      match_score: dest.match_score,
                    },
                  });
                }}
              >
                <div className={CARD_MEDIA}>
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  {dest.michelin_stars && dest.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <span>⭐</span>
                      <span>{dest.michelin_stars}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className={CARD_TITLE}>{dest.name}</div>
                  <div className={CARD_META}>
                    {dest.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {dest.city}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

