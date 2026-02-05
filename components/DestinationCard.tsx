'use client';

import { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { MapPin, Check } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity } from '@/lib/utils';
import { DestinationCardSkeleton } from '@/ui/DestinationCardSkeleton';
import { DestinationBadges } from './DestinationBadges';
import { QuickActions } from './QuickActions';

interface DestinationCardProps {
  destination: Destination;
  onClick?: () => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  showQuickActions?: boolean;
  className?: string;
  onAddToTrip?: () => void;
}

/**
 * Destination Card - clean, quiet presentation
 * Memoized to prevent unnecessary re-renders
 */
export const DestinationCard = memo(function DestinationCard({
  destination,
  onClick,
  index = 0,
  isVisited = false,
  showBadges = true,
  showQuickActions = true,
  className = '',
  onAddToTrip,
}: DestinationCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  // Intersection Observer for progressive loading
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px', threshold: 0.1 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      type="button"
      className={`group relative w-full flex flex-col cursor-pointer text-left ${className}`}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[var(--editorial-border)] mb-3">
        {/* Skeleton while loading */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 animate-pulse bg-[var(--editorial-border)]" />
        )}

        {/* Image */}
        {isInView && (destination.image_thumbnail || destination.image) && !imageError ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true);
              setIsLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--editorial-text-tertiary)]">
            <MapPin className="h-12 w-12 opacity-20" />
          </div>
        )}

        {/* Quick Actions - top right, visible on hover */}
        {showQuickActions && destination.slug && (
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <QuickActions
              destinationId={destination.id}
              destinationSlug={destination.slug}
              destinationName={destination.name}
              destinationCity={destination.city}
              showAddToTrip={true}
              compact
              onAddToTrip={onAddToTrip}
            />
          </div>
        )}

        {/* Visited badge */}
        {isVisited && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-[var(--editorial-text-primary)] stroke-[3]" />
          </div>
        )}

        {/* Michelin Stars badge */}
        {showBadges && typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
          <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 text-[var(--editorial-text-primary)] text-xs font-medium bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-sm">
            <img src="/michelin-star.svg" alt="Michelin star" className="h-3.5 w-3.5" />
            <span>{destination.michelin_stars}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] line-clamp-2">
          {destination.name}
        </h3>
        <div className="text-xs text-[var(--editorial-text-secondary)] line-clamp-1">
          {destination.micro_description ||
           (destination.category && destination.city
             ? `${destination.category} in ${capitalizeCity(destination.city)}`
             : destination.city
               ? `Located in ${capitalizeCity(destination.city)}`
               : destination.category || '')}
        </div>
        {/* ML Badges */}
        {showBadges && destination.id && (
          <div className="mt-1.5">
            <DestinationBadges destinationId={destination.id} compact={true} showTiming={false} />
          </div>
        )}
      </div>
    </button>
  );
});

/**
 * Lazy-loaded version that shows skeleton until in viewport
 */
export function LazyDestinationCard(props: DestinationCardProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.01 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef}>
      {shouldRender ? (
        <DestinationCard {...props} />
      ) : (
        <DestinationCardSkeleton />
      )}
    </div>
  );
}
