'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Loader2, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';
import { SearchFiltersComponent, SearchFilters } from '@/src/features/search/SearchFilters';

/**
 * Navigation Bar Component - DS+R-inspired horizontal divider
 *
 * Sticky bar with left navigation links, center actions, and right view/sort options.
 * Restores AI chat trigger, Create Trip, advanced filters, and Discover by Cities.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    selectedCity,
    selectedCategory,
    searchTerm,
    clearFilters,
    filteredDestinations,
    cities,
    categories,
    michelinOnly,
    crownOnly,
    setMichelinOnly,
    setCrownOnly,
    setSelectedCity,
    setSelectedCategory,
    viewMode,
    setViewMode,
    openAIChat,
  } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  const hasFilters = selectedCity || selectedCategory || searchTerm || michelinOnly || crownOnly;

  // Handle create trip
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setCreatingTrip(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
    } finally {
      setCreatingTrip(false);
    }
  }, [user, router]);

  // Handle filter changes from SearchFiltersComponent
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setAdvancedFilters(newFilters);
    if (newFilters.michelin !== undefined) {
      setMichelinOnly(!!newFilters.michelin);
    }
    if (newFilters.city !== undefined) {
      setSelectedCity(newFilters.city || '');
    }
    if (newFilters.category !== undefined) {
      setSelectedCategory(newFilters.category || '');
    }
  }, [setMichelinOnly, setSelectedCity, setSelectedCategory]);

  return (
    <div className="border-t border-[var(--editorial-text-primary)] py-4 mb-8 sticky top-0 z-30 bg-[var(--editorial-bg)]">
      <div className="flex items-start justify-between gap-4">
        {/* Left - Navigation Links */}
        <div className="flex flex-col gap-1">
          <Link
            href="/cities"
            className="text-xs md:text-sm font-mono uppercase tracking-[0.1em]
                       text-[var(--editorial-text-primary)] hover:opacity-60 transition-opacity font-semibold"
          >
            Destinations
          </Link>
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="text-left text-xs md:text-sm font-mono uppercase tracking-[0.1em]
                       text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          >
            {creatingTrip ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating...
              </span>
            ) : (
              'Trips'
            )}
          </button>
          <Link
            href="/about"
            className="text-xs md:text-sm font-mono uppercase tracking-[0.1em]
                       text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          >
            About
          </Link>
          <button
            onClick={() => openAIChat()}
            className="text-left text-xs md:text-sm font-mono uppercase tracking-[0.1em]
                       text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors
                       flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            AI Guide
          </button>
        </div>

        {/* Center - Actions & Filters */}
        <div className="flex flex-col items-center gap-3 pt-0.5">
          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            {/* AI Chat */}
            <button
              onClick={() => openAIChat()}
              className="flex h-9 items-center gap-1.5 px-3
                         border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)]
                         text-xs font-medium text-[var(--editorial-text-primary)]
                         hover:bg-[var(--editorial-border-subtle)]
                         active:scale-[0.98] transition-all duration-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Search</span>
            </button>

            {/* Create Trip */}
            <button
              onClick={handleCreateTrip}
              disabled={creatingTrip}
              className="flex h-9 items-center gap-1.5 px-3
                         bg-[var(--editorial-accent)] text-white
                         text-xs font-medium
                         disabled:opacity-50 hover:bg-[var(--editorial-accent-hover)]
                         active:scale-[0.98] transition-all duration-200"
            >
              {creatingTrip ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {creatingTrip ? 'Creating...' : 'Trip'}
              </span>
            </button>

            {/* Advanced Filters */}
            <SearchFiltersComponent
              filters={advancedFilters}
              onFiltersChange={handleFiltersChange}
              availableCities={cities}
              availableCategories={categories}
              fullWidthPanel={true}
              useFunnelIcon={true}
            />

            {/* Discover by Cities */}
            <Link
              href="/cities"
              className="hidden md:flex h-9 items-center gap-1.5 px-3
                         border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)]
                         text-xs font-medium text-[var(--editorial-text-primary)]
                         hover:bg-[var(--editorial-border-subtle)]
                         active:scale-[0.98] transition-all duration-200"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Cities</span>
            </Link>
          </div>

          {/* Filter Status */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-mono uppercase tracking-[0.1em]
                         text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Right - View/Sort Options */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs md:text-sm font-mono text-[var(--editorial-text-secondary)]">
            {filteredDestinations.length} places
          </span>
          <button
            onClick={() => setViewMode('grid')}
            className={`text-xs md:text-sm font-mono uppercase tracking-[0.1em] transition-opacity
                       ${viewMode === 'grid' ? 'text-[var(--editorial-text-primary)] font-semibold' : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`text-xs md:text-sm font-mono uppercase tracking-[0.1em] transition-opacity
                       ${viewMode === 'map' ? 'text-[var(--editorial-text-primary)] font-semibold' : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'}`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Inline filter slot for SearchFiltersComponent */}
      <div id="search-filters-inline-slot" />
    </div>
  );
}
