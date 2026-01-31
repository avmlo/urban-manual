'use client';

import { useEffect, useRef, useCallback, useState, memo } from 'react';
import { useHomepageData } from './HomepageDataProvider';
import { InstantGridSkeleton } from './InstantGridSkeleton';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import Image from 'next/image';

/**
 * Overlay-style destination card for the DS+R-inspired grid.
 * Tall portrait images with title and category overlaid at bottom.
 */
const OverlayCard = memo(function OverlayCard({
  destination,
  onClick,
  index = 0,
}: {
  destination: Destination;
  onClick?: () => void;
  index?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={cardRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      type="button"
      className="group relative w-full aspect-[3/4] overflow-hidden cursor-pointer text-left focus-ring
                 transition-all duration-300 ease-out hover:opacity-90 active:scale-[0.99]"
      aria-label={`View ${destination.name} in ${capitalizeCity(destination.city)}`}
    >
      {/* Image */}
      {(destination.image_thumbnail || destination.image) && !imageError ? (
        <Image
          src={destination.image_thumbnail || destination.image!}
          alt={`${destination.name} in ${capitalizeCity(destination.city)}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={`object-cover transition-all duration-500 ease-out
                     group-hover:scale-[1.03]
                     ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--editorial-border)] text-[var(--editorial-text-tertiary)]">
          <MapPin className="h-12 w-12 opacity-20" />
        </div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-[var(--editorial-border)]" />
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Text overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
        <h3 className="text-sm md:text-base font-semibold text-white leading-tight line-clamp-2 uppercase tracking-wide">
          {destination.name}
        </h3>
        <p className="text-xs md:text-sm text-white/70 mt-1 uppercase tracking-[0.1em] font-mono">
          {capitalizeCategory(destination.category)}
        </p>
      </div>

      {/* Michelin badge */}
      {typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
        <div className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm
                        flex items-center gap-1 text-black">
          <img src="/michelin-star.svg" alt="Michelin star" className="h-3 w-3" />
          <span>{destination.michelin_stars}</span>
        </div>
      )}
    </button>
  );
});

/**
 * Client Destination Grid with Pagination
 *
 * Uses the HomepageDataProvider context for:
 * - Data loading with fallback
 * - Pagination (4 rows per page)
 * - Filtering (city, category, search)
 */

export function ClientDestinationGrid() {
  const {
    destinations,
    displayedDestinations,
    filteredDestinations,
    isLoading,
    hasError,
    errorMessage,
    currentPage,
    totalPages,
    setCurrentPage,
    selectedCity,
    selectedCategory,
    searchTerm,
    michelinOnly,
    crownOnly,
    clearFilters,
    openDestination,
    refetch,
    setSearchTerm,
  } = useHomepageData();

  const hasFilters = selectedCity || selectedCategory || searchTerm || michelinOnly || crownOnly;

  // Reference for swipe detection
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Handle page navigation
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  // Keyboard navigation: Left/Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  // Swipe navigation for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;

    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 75; // Minimum swipe distance in pixels

    if (swipeDistance > minSwipeDistance) {
      // Swiped left -> next page
      goToNextPage();
    } else if (swipeDistance < -minSwipeDistance) {
      // Swiped right -> previous page
      goToPrevPage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [goToNextPage, goToPrevPage]);

  // Show skeleton while loading
  if (isLoading) {
    return <InstantGridSkeleton count={21} />;
  }

  // Show error state with retry button
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Unable to load destinations
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          {errorMessage || 'Something went wrong. Please check your connection and try again.'}
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                     bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full
                     hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  // Show empty state if no destinations at all (but no error - unexpected state)
  if (destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No destinations available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          We couldn&apos;t find any destinations. Try refreshing the page.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                     bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full
                     hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  // Show smart no results for search with alternatives
  if (filteredDestinations.length === 0 && searchTerm) {
    return (
      <SmartEmptyState
        query={searchTerm}
        intent={{
          city: selectedCity || null,
          category: selectedCategory || null,
        }}
        onAlternativeClick={(alternative) => {
          // Handle alternative click - update search or clear and apply suggestion
          if (alternative.includes('Try removing') || alternative.includes('Expand')) {
            clearFilters();
          } else if (alternative.includes('Browse all')) {
            clearFilters();
          } else {
            // Apply the alternative as a new search term
            setSearchTerm(alternative);
          }
        }}
      />
    );
  }

  // Show no results for filters (without search term) - simpler state
  if (filteredDestinations.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          No destinations match your current filters
        </p>
        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white
                     bg-gray-100 dark:bg-white/10 rounded-full
                     hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid - 3 column overlay cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {displayedDestinations.map((destination, index) => (
          <OverlayCard
            key={destination.slug}
            destination={destination}
            index={index}
            onClick={() => openDestination(destination)}
          />
        ))}
      </div>

      {/* Pagination Controls - Apple style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-10 sm:mt-12 mb-8">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-white/5
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-gray-50 dark:hover:bg-white/10
                       active:bg-gray-100 dark:active:bg-white/15
                       transition-all duration-200"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Page Numbers - show fewer on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: Math.min(totalPages, typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 7) }, (_, i) => {
              let pageNum: number;
              const maxVisible = 7; // Use consistent logic, CSS will handle visibility

              // Smart page number display
              if (totalPages <= maxVisible) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - maxVisible + 1 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 sm:w-10 sm:h-10 rounded-full text-sm font-medium transition-all duration-200
                             active:scale-95 ${
                    currentPage === pageNum
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 dark:active:bg-white/15'
                  } ${i >= 5 ? 'hidden sm:flex items-center justify-center' : 'flex items-center justify-center'}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-white/5
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-gray-50 dark:hover:bg-white/10
                       active:bg-gray-100 dark:active:bg-white/15
                       transition-all duration-200"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Results count & keyboard hint */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 mb-8">
        <span>
          Showing {(currentPage - 1) * displayedDestinations.length + 1}-
          {Math.min(currentPage * displayedDestinations.length, filteredDestinations.length)} of {filteredDestinations.length} destinations
        </span>
        <span className="hidden md:inline ml-2">
          • Use <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-xs">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono text-xs">→</kbd> to navigate
        </span>
      </div>
    </div>
  );
}

export default ClientDestinationGrid;
