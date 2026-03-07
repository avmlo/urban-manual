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
  onSelect?: (destination: Destination) => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  showQuickActions?: boolean;
  className?: string;
  onAddToTrip?: () => void;
}

/**
 * Enhanced Destination Card with hover interactions and progressive loading
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
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Simply call onClick - Drawer component handles scroll locking without layout shift
    if (onSelect) {
      onSelect(destination);
    } else {
      onClick?.();
    }
  };

  return (
    <button
      ref={cardRef}
      onClick={handleClick}
      type="button"
      className={`
        group relative w-full flex flex-col transition-all duration-300 ease-out
        cursor-pointer text-left focus-ring
        hover:scale-[1.01]
        active:scale-[0.98]
        ${className}
      `}
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
        {/* Image Container with Progressive Loading - 16:9 ratio */}
        <div
          className={`
            relative aspect-video overflow-hidden rounded-2xl
            bg-[var(--editorial-border)]
            transition-all duration-300 ease-out
            mb-3
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        >
        {/* Skeleton while loading */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 animate-pulse bg-[var(--editorial-border)]" />
        )}

        {/* Actual Image - Use thumbnail for cards, fallback to full image */}
        {isInView && (destination.image_thumbnail || destination.image) && !imageError ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`
              object-cover
              transition-all duration-500 ease-out
              group-hover:scale-105
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
            `}
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
            <MapPin className="h-12 w-12 opacity-20 transition-transform duration-300 group-hover:scale-105" />
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className={`
            absolute inset-0
            bg-gradient-to-t from-black/60 via-transparent to-transparent
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
            pointer-events-none
          `}
        />

        {/* Quick Actions - Top Right on Hover */}
        {showQuickActions && destination.slug && (
          <div
            className={`
              absolute top-2 right-2 z-20
              opacity-0 group-hover:opacity-100
              translate-y-1 group-hover:translate-y-0
              transition-all duration-200
            `}
          >
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

        {/* Visited Check Badge - Center */}
        {isVisited && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-[var(--editorial-text-primary)] stroke-[3]" />
          </div>
        )}

        {/* Badges - Animated on hover */}
        {showBadges && (
          <>
            {/* Michelin Stars - Bottom Left */}
            {typeof destination.michelin_stars === 'number' &&
              destination.michelin_stars > 0 && (
                <div
                  className={`
                    absolute bottom-2 left-2 z-10
                    px-2.5 py-1 text-[var(--editorial-text-primary)] text-xs font-medium
                    bg-white/95 backdrop-blur-sm rounded-full
                    flex items-center gap-1.5
                    shadow-sm
                    transition-transform duration-300
                  `}
                >
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="h-3.5 w-3.5"
                  />
                  <span>{destination.michelin_stars}</span>
                </div>
              )}

          </>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-1 flex flex-col">
        <div>
        <h3
          className={`
            text-sm font-medium text-[var(--editorial-text-primary)]
              line-clamp-2
            transition-colors duration-200
            group-hover:text-[var(--editorial-text-secondary)]
          `}
        >
          {destination.name}
        </h3>

        {/* Micro Description - Always show with fallback, stuck to title */}
        <div className="text-xs text-[var(--editorial-text-secondary)] line-clamp-1">
          {destination.micro_description ||
           (destination.category && destination.city
             ? `${destination.category} in ${capitalizeCity(destination.city)}`
             : destination.city
               ? `Located in ${capitalizeCity(destination.city)}`
               : destination.category || '')}
        </div>

        {/* ML Forecasting Badges */}
        {showBadges && destination.id && (
          <div className="mt-2">
            <DestinationBadges destinationId={destination.id} compact={true} showTiming={false} />
          </div>
        )}
        </div>
      </div>

      {/* Focus Ring for Accessibility */}
      <div
        className={`
          absolute inset-0
          ring-2 ring-offset-2 ring-[var(--editorial-text-primary)]
          opacity-0 focus-within:opacity-100
          transition-opacity duration-200
          pointer-events-none
        `}
      />
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
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
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

