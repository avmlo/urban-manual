'use client';

import { useState, useId } from 'react';
import { X, SlidersHorizontal, Clock } from 'lucide-react';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/tooltip';

export interface SearchFilters {
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  availableCities,
  availableCategories,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Generate unique IDs for accessibility
  const cityId = useId();
  const categoryId = useId();
  const minPriceId = useId();
  const maxPriceId = useId();
  const ratingId = useId();

  function updateFilter(key: keyof SearchFilters, value: any) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearFilter(key: keyof SearchFilters) {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  }

  function clearAll() {
    onFiltersChange({});
  }

  const hasActiveFilters = Object.keys(filters).length > 0;
  const filterCount = Object.keys(filters).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="relative w-12 h-12 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
              aria-label={`Open filters${filterCount > 0 ? ` (${filterCount} active)` : ''}`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {filterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Filter destinations</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              {Object.entries(filters).map(([key, value]) => {
                let displayValue = String(value);
                if (key === 'openNow' && value === true) displayValue = 'Open Now';
                else if (key === 'michelin' && value === true) displayValue = 'Michelin';
                else if (key === 'crown' && value === true) displayValue = 'Crown';
                else if (key === 'minPrice') displayValue = `Min $${'$'.repeat(value as number)}`;
                else if (key === 'maxPrice') displayValue = `Max $${'$'.repeat(value as number)}`;
                else if (key === 'minRating') displayValue = `${value}+`;

                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {displayValue}
                    <button
                      onClick={() => clearFilter(key as keyof SearchFilters)}
                      className="ml-1 hover:text-red-500"
                      aria-label={`Remove filter: ${displayValue}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {/* City Filter */}
            <div>
              <label htmlFor={cityId} className="block text-sm font-medium mb-2">City</label>
              <select
                id={cityId}
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              >
                <option value="">Select City</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor={categoryId} className="block text-sm font-medium mb-2">Category</label>
              <select
                id={categoryId}
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              >
                <option value="">Select Category</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Michelin Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.michelin || false}
                  onChange={(e) => updateFilter('michelin', e.target.checked || undefined)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 focus:ring-neutral-900 dark:focus:ring-white"
                />
                <span className="text-sm">Michelin Starred Only</span>
              </label>
            </div>

            {/* Crown Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.crown || false}
                  onChange={(e) => updateFilter('crown', e.target.checked || undefined)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 focus:ring-neutral-900 dark:focus:ring-white"
                />
                <span className="text-sm">Crown Badge Only</span>
              </label>
            </div>

            {/* Price Range */}
            <div>
              <span className="block text-sm font-medium mb-2">Price Level</span>
              <div className="flex gap-2">
                <select
                  aria-label="Minimum price"
                  id={minPriceId}
                  value={filters.minPrice || ''}
                  onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
                >
                  <option value="">Min</option>
                  {[1, 2, 3, 4].map(level => (
                    <option key={level} value={level}>{'$'.repeat(level)}</option>
                  ))}
                </select>
                <select
                  aria-label="Maximum price"
                  id={maxPriceId}
                  value={filters.maxPrice || ''}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
                >
                  <option value="">Max</option>
                  {[1, 2, 3, 4].map(level => (
                    <option key={level} value={level}>{'$'.repeat(level)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label htmlFor={ratingId} className="block text-sm font-medium mb-2">Minimum Rating</label>
              <select
                id={ratingId}
                value={filters.minRating || ''}
                onChange={(e) => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
              >
                <option value="">Any</option>
                <option value="4.5">4.5+ rating</option>
                <option value="4.0">4.0+ rating</option>
                <option value="3.5">3.5+ rating</option>
                <option value="3.0">3.0+ rating</option>
              </select>
            </div>

            {/* Open Now Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.openNow || false}
                  onChange={(e) => updateFilter('openNow', e.target.checked || undefined)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 focus:ring-neutral-900 dark:focus:ring-white"
                />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">Open Now</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
