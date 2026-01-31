'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Navigation Bar Component - DS+R-inspired horizontal divider
 *
 * Sticky bar with left navigation links, center filter count, and right view/sort options.
 * Acts as a visual separator between the hero and the content grid.
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
    michelinOnly,
    crownOnly,
    setMichelinOnly,
    viewMode,
    setViewMode,
  } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);

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
          <Link
            href="/chat"
            className="text-xs md:text-sm font-mono uppercase tracking-[0.1em]
                       text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
          >
            AI Guide
          </Link>
        </div>

        {/* Center - Filter Status */}
        <div className="flex items-center gap-3 pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={michelinOnly}
              onChange={(e) => setMichelinOnly(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--editorial-text-secondary)]
                         accent-[var(--editorial-text-primary)]"
            />
            <span className="text-xs md:text-sm font-mono uppercase tracking-[0.1em] text-[var(--editorial-text-secondary)]">
              Michelin Only ({filteredDestinations.filter(d => d.michelin_stars && d.michelin_stars > 0).length})
            </span>
          </label>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-mono uppercase tracking-[0.1em]
                         text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors
                         underline underline-offset-2"
            >
              Clear
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
    </div>
  );
}
