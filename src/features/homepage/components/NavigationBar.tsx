'use client';

import { X } from 'lucide-react';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Navigation Bar Component
 *
 * Minimal bar showing result count and a clear-filters action.
 */
export default function NavigationBar() {
  const {
    selectedCity,
    selectedCategory,
    searchTerm,
    clearFilters,
    filteredDestinations,
    michelinOnly,
    crownOnly,
  } = useHomepageData();

  const hasFilters = selectedCity || selectedCategory || searchTerm || michelinOnly || crownOnly;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-[var(--editorial-text-secondary)]">
          {filteredDestinations.length} destinations
        </p>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
