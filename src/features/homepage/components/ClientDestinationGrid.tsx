'use client';

import { useCallback } from 'react';
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
    <div>
      {/* Grid with Quick Actions on Hover */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-5 md:gap-6 lg:gap-7 items-start">
        {displayedDestinations.map((destination, index) => (
          <DestinationCard
            key={destination.slug}
            destination={destination}
            index={index}
            onClick={() => openDestination(destination)}
            showQuickActions={false}
            showBadges={true}
          />
        ))}
      </div>

      {/* Pagination - minimal prev/next */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 mt-10 mb-8">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-10 h-10 rounded-full
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--editorial-text-secondary)]" />
          </button>
          <span className="text-xs text-[var(--editorial-text-tertiary)]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-10 h-10 rounded-full
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-[var(--editorial-text-secondary)]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ClientDestinationGrid;
