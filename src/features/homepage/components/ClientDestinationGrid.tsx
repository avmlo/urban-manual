'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useHomepageData } from './HomepageDataProvider';
import { InstantGridSkeleton } from './InstantGridSkeleton';
import { DestinationCard } from '@/components/DestinationCard';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

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

  // Swipe detection refs
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
    if (swipeDistance > 75) goToNextPage();
    else if (swipeDistance < -75) goToPrevPage();
    touchStartX.current = null;
    touchEndX.current = null;
  }, [goToNextPage, goToPrevPage]);

  // Loading
  if (isLoading) {
    return <InstantGridSkeleton count={21} />;
  }

  // Error
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

  // Empty (no data at all)
  if (destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

  // No results from search
  if (filteredDestinations.length === 0 && searchTerm) {
    return (
      <SmartEmptyState
        query={searchTerm}
        intent={{
          city: selectedCity || null,
          category: selectedCategory || null,
        }}
        onAlternativeClick={(alternative) => {
          if (alternative.includes('Try removing') || alternative.includes('Expand') || alternative.includes('Browse all')) {
            clearFilters();
          } else {
            setSearchTerm(alternative);
          }
        }}
      />
    );
  }

  // No results from filters
  if (filteredDestinations.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
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

  // Build page numbers
  const pageNumbers: number[] = [];
  if (totalPages > 1) {
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= maxVisible; i++) pageNumbers.push(i);
    } else if (currentPage >= totalPages - 3) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      for (let i = currentPage - 3; i <= currentPage + 3; i++) pageNumbers.push(i);
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-5 md:gap-6 lg:gap-7 items-start">
        {displayedDestinations.map((destination, index) => (
          <DestinationCard
            key={destination.slug}
            destination={destination}
            index={index}
            onClick={() => openDestination(destination)}
            showQuickActions={true}
            showBadges={true}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-10 mb-8">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-9 h-9 rounded-full
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
          </button>

          <div className="flex items-center gap-0.5">
            {pageNumbers.map((pageNum, i) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-full text-xs flex items-center justify-center
                  ${currentPage === pageNum
                    ? 'text-[var(--editorial-text-primary)] font-medium'
                    : 'text-[var(--editorial-text-tertiary)]'
                  }
                  ${i >= 5 ? 'hidden sm:flex' : ''}
                `}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-9 h-9 rounded-full
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ClientDestinationGrid;
