"use client";

import Image from "next/image";
import { Destination } from "@/types/destination";

interface DestinationGridProps {
  destinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
}

export function DestinationGrid({ destinations, onDestinationClick }: DestinationGridProps) {
  return (
    <div className="px-10 md:px-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.slug}
            destination={destination}
            onClick={() => onDestinationClick?.(destination)}
          />
        ))}
      </div>
    </div>
  );
}

function DestinationCard({
  destination,
  onClick
}: {
  destination: Destination;
  onClick?: () => void;
}) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block text-left w-full"
      aria-label={`View ${destination.name}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden mb-4">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-opacity duration-200 group-hover:opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-[var(--editorial-border)]" />
        )}
      </div>

      {/* Caption */}
      <div className="space-y-1">
        <h3 className="text-[15px] font-medium text-[var(--editorial-text-primary)] leading-tight">
          {destination.name}
        </h3>
        <p className="text-[13px] text-[var(--editorial-text-secondary)]">
          {destination.city}
        </p>
      </div>
    </button>
  );
}
