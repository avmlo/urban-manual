'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';

interface RankedDestinationCardProps {
  destination: Destination & { rank?: number; curator_notes?: string };
  rank?: number;
  curatorNotes?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Destination card with rank badge and curator notes
 * Used in curated public lists (e.g., "Top Hotels")
 */
export const RankedDestinationCard = memo(function RankedDestinationCard({
  destination,
  rank,
  curatorNotes,
  onClick,
  className = '',
}: RankedDestinationCardProps) {
  const displayRank = rank ?? destination.rank;
  const displayNotes = curatorNotes ?? destination.curator_notes;

  const content = (
    <div className={`${CARD_WRAPPER} ${className} flex flex-col`}>
      <div className={`${CARD_MEDIA} mb-2 hover-lift`}>
        {(destination.image_thumbnail || destination.image) ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="h-8 w-8 opacity-20" />
          </div>
        )}

        {/* Rank Badge */}
        {displayRank != null && (
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/80 dark:bg-white/90 flex items-center justify-center">
            <span className="text-xs font-bold text-white dark:text-black">
              {displayRank}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-0 flex-1 flex flex-col">
        <h3 className={`${CARD_TITLE} line-clamp-2 min-h-[2.5rem]`}>
          {destination.name}
        </h3>
        <div className={CARD_META}>
          {destination.category && (
            <span className="capitalize">{destination.category}</span>
          )}
          {destination.category && destination.city && <span>·</span>}
          {destination.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {capitalizeCity(destination.city)}
            </span>
          )}
        </div>

        {/* Curator Notes */}
        {displayNotes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic line-clamp-2">
            &ldquo;{displayNotes}&rdquo;
          </p>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/destination/${destination.slug}`} className="block">
      {content}
    </Link>
  );
});
