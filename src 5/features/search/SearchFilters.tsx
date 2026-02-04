'use client';

import { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, MapPin, Loader2, Search, Sparkles } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface SearchFilters {
  searchQuery?: string;
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  nearMe?: boolean;
  nearMeRadius?: number;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
  onLocationChange?: (lat: number | null, lng: number | null, radius: number) => void;
  sortBy?: 'default' | 'recent';
  onSortChange?: (sortBy: 'default' | 'recent') => void;
  isAdmin?: boolean;
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  availableCities,
  availableCategories,
  onLocationChange,
  sortBy = 'default',
  onSortChange,
  isAdmin = false,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { latitude, longitude, error, loading, requestLocation, hasLocation } = useGeolocation();
  const [nearMeRadius, setNearMeRadius] = useState(filters.nearMeRadius || 5);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Sync searchQuery with filters
  useEffect(() => {
    setSearchQuery(filters.searchQuery || '');
  }, [filters.searchQuery]);

  // Handle search query changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (filters.searchQuery || '')) {
        if (searchQuery.trim()) {
          updateFilter('searchQuery', searchQuery.trim());
        } else {
          clearFilter('searchQuery');
        }
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function updateFilter(key: keyof SearchFilters, value: any) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearFilter(key: keyof SearchFilters) {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);

    if (key === 'nearMe') {
      onLocationChange?.(null, null, nearMeRadius);
    }
  }

  function clearAll() {
    onFiltersChange({});
    onLocationChange?.(null, null, nearMeRadius);
  }

  function toggleNearMe(enabled: boolean) {
    if (enabled) {
      if (!hasLocation) {
        requestLocation();
      }
      updateFilter('nearMe', true);
      updateFilter('nearMeRadius', nearMeRadius);
      if (hasLocation && latitude && longitude) {
        onLocationChange?.(latitude, longitude, nearMeRadius);
      }
    } else {
      clearFilter('nearMe');
      clearFilter('nearMeRadius');
      onLocationChange?.(null, null, nearMeRadius);
    }
  }

  function updateRadius(radius: number) {
    setNearMeRadius(radius);
    updateFilter('nearMeRadius', radius);
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, radius);
    }
  }

  useEffect(() => {
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, nearMeRadius);
    }
  }, [hasLocation, latitude, longitude, filters.nearMe, nearMeRadius]);

  const activeFilterCount = Object.keys(filters).length;
  const hasActiveFilters = activeFilterCount > 0;
  const activeFiltersAnnouncement = hasActiveFilters
    ? `${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'}`
    : 'No filters applied';

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km}km`;
  };

  const capitalizeCity = (city: string) => {
    return city.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const capitalizeCategory = (category: string) => {
    return category.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom + 8,
              right: window.innerWidth - rect.right,
            });
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Toggle filters"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black rounded-full">
            {Object.keys(filters).length}
          </span>
        )}
      </button>
      <span aria-live="polite" role="status" className="sr-only">
        {activeFiltersAnnouncement}
      </span>

      {/* Dropdown filter panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown popover */}
          <div
            className="fixed z-50 w-[90vw] max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-150"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Arrow/caret */}
            <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white dark:bg-gray-900 border-t border-l border-gray-200 dark:border-gray-800" aria-hidden="true" />
            
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Filters</div>
                  <div className="flex items-center gap-3">
                    {hasActiveFilters && (
                      <button
                        onClick={clearAll}
                        className="text-xs text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="Close filters"
                    >
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="space-y-6">
                  {/* Text Search - Only filters grid, doesn't trigger top search */}
                  <fieldset className="space-y-3">
                    <legend className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Search</legend>
                    <div className="relative">
                      <label htmlFor="search-filter" className="sr-only">
                        Filter destinations
                      </label>
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600" />
                      <input
                        id="search-filter"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter destinations..."
                        className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            clearFilter('searchQuery');
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </fieldset>

                  {/* Special Filters */}
                  <fieldset>
                    <legend className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Special</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <button
                        type="button"
                        onClick={() => updateFilter('michelin', filters.michelin ? undefined : true)}
                        className={`transition-all ${
                          filters.michelin
                            ? "font-medium text-black dark:text-white"
                            : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                        }`}
                        aria-pressed={Boolean(filters.michelin)}
                      >
                        Michelin
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFilter('openNow', filters.openNow ? undefined : true)}
                        className={`transition-all ${
                          filters.openNow
                            ? "font-medium text-black dark:text-white"
                            : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                        }`}
                        aria-pressed={Boolean(filters.openNow)}
                      >
                        Open Now
                      </button>
                    </div>
                  </fieldset>

                  {/* Rating Filter */}
                  <fieldset>
                    <legend className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Minimum Rating</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <button
                        type="button"
                        onClick={() => updateFilter('minRating', undefined)}
                        className={`transition-all ${
                          !filters.minRating
                            ? "font-medium text-black dark:text-white"
                            : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                        }`}
                        aria-pressed={!filters.minRating}
                      >
                        Any
                      </button>
                      {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                        <button
                          type="button"
                          key={rating}
                          onClick={() => updateFilter('minRating', filters.minRating === rating ? undefined : rating)}
                          className={`transition-all ${
                            filters.minRating === rating
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                          }`}
                          aria-pressed={filters.minRating === rating}
                        >
                          {rating}+
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Price Filter */}
                  <fieldset>
                    <legend className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Price Level</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          updateFilter('minPrice', undefined);
                          updateFilter('maxPrice', undefined);
                        }}
                        className={`transition-all ${
                          !filters.minPrice && !filters.maxPrice
                            ? "font-medium text-black dark:text-white"
                            : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                        }`}
                        aria-pressed={!filters.minPrice && !filters.maxPrice}
                      >
                        Any
                      </button>
                      {[1, 2, 3, 4].map((level) => (
                        <button
                          type="button"
                          key={level}
                          onClick={() => {
                            if (filters.minPrice === level && filters.maxPrice === level) {
                              updateFilter('minPrice', undefined);
                              updateFilter('maxPrice', undefined);
                            } else {
                              updateFilter('minPrice', level);
                              updateFilter('maxPrice', level);
                            }
                          }}
                          className={`transition-all ${
                            filters.minPrice === level && filters.maxPrice === level
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                          }`}
                          aria-pressed={filters.minPrice === level && filters.maxPrice === level}
                        >
                          {'$'.repeat(level)}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Sort Filter (Admin Only) */}
                  {isAdmin && onSortChange && (
                    <fieldset className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <legend className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Sort</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onSortChange('default')}
                          className={`flex items-center gap-1.5 transition-all ${
                            sortBy === 'default'
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                          }`}
                          aria-pressed={sortBy === 'default'}
                        >
                          Default
                        </button>
                        <button
                          type="button"
                          onClick={() => onSortChange('recent')}
                          className={`flex items-center gap-1.5 transition-all ${
                            sortBy === 'recent'
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                          }`}
                          aria-pressed={sortBy === 'recent'}
                        >
                          <Sparkles className="h-3 w-3" />
                          Recent Added
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {/* Near Me Filter */}
                  <fieldset className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <legend className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500 dark:text-gray-500">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                      Near Me
                    </legend>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-500">Use current location</span>
                      <button
                        type="button"
                        onClick={() => toggleNearMe(!filters.nearMe)}
                        disabled={loading}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          filters.nearMe ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                        aria-pressed={Boolean(filters.nearMe)}
                        aria-label={filters.nearMe ? 'Disable near me filter' : 'Enable near me filter'}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-black transition-transform ${
                            filters.nearMe ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {loading && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mb-3">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Getting your location...</span>
                      </div>
                    )}

                    {error && filters.nearMe && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Location access denied. Please enable in browser settings.
                      </div>
                    )}

                    {filters.nearMe && hasLocation && !error && (
                      <div className="space-y-3 mt-4">
                        <label htmlFor="near-me-radius" className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-500">Radius</span>
                          <span className="font-medium text-black dark:text-white">{formatDistance(nearMeRadius)}</span>
                        </label>
                        <input
                          id="near-me-radius"
                          type="range"
                          min="0.5"
                          max="25"
                          step="0.5"
                          value={nearMeRadius}
                          onChange={(e) => updateRadius(parseFloat(e.target.value))}
                          className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                          aria-valuenow={nearMeRadius}
                          aria-valuetext={formatDistance(nearMeRadius)}
                        />
                        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600">
                          <span>500m</span>
                          <span>25km</span>
                        </div>
                      </div>
                    )}
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
