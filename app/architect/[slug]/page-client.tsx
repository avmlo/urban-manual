'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { slugToArchitectName } from '@/lib/architect-utils';

// IntelligentDrawer for destination details
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';

function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function ArchitectPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const architectSlug = params?.slug ? decodeURIComponent(params.slug as string) : '';
  const architectName = slugToArchitectName(architectSlug);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  const [loading, setLoading] = useState(true);
  // Drawer now handled by IntelligentDrawer
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = useItemsPerPage(4);

  const { openDrawer, isDrawerOpen: isDrawerTypeOpen, closeDrawer } = useDrawer();

  useEffect(() => {
    setLoading(true);
    fetchDestinations();
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
    setCurrentPage(1);
  }, [architectSlug, user]);

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, advancedFilters);
    } else {
      setFilteredDestinations([]);
    }
  }, [destinations, selectedCategory, advancedFilters]);

  const fetchDestinations = async () => {
    try {
      // Fetch all destinations with architect info and filter client-side
      // This handles cases where architect names might have variations
      const { data, error } = await supabase
        .from('destinations')
        .select(
          'slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, opening_hours_json, rating, tags, design_firm, architectural_style'
        )
        .not('design_firm', 'is', null)
        .neq('design_firm', '')
        .is('parent_destination_id', null)
        .order('name');

      if (error) throw error;

      // Filter by architect name (case-insensitive, handles variations)
      const normalizedArchitectName = architectName.toLowerCase().trim();
      const results = (data || []).filter((d: any) => {
        if (!d.design_firm) return false;
        const normalizedDbName = d.design_firm.toLowerCase().trim();
        // Check if the architect name contains our search term or vice versa
        return normalizedDbName.includes(normalizedArchitectName) || 
               normalizedArchitectName.includes(normalizedDbName) ||
               // Also check if slugified versions match
               normalizedDbName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') === 
               normalizedArchitectName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      });

      setDestinations(results);

      // Count destinations per category (case-insensitive)
      const categoryCounts = new Map<string, number>();
      const categoryOriginalCase = new Map<string, string>(); // Track original case
      results.forEach((d: any) => {
        if (d.category) {
          const categoryLower = d.category.toLowerCase();
          // Use lowercase for counting, but preserve original case
          if (!categoryOriginalCase.has(categoryLower)) {
            categoryOriginalCase.set(categoryLower, d.category);
          }
          categoryCounts.set(categoryLower, (categoryCounts.get(categoryLower) || 0) + 1);
        }
      });

      const activeCategories = Array.from(categoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([categoryLower, _]) => categoryOriginalCase.get(categoryLower) || categoryLower);

      setCategories(activeCategories);

      applyFilters(results, selectedCategory, advancedFilters);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinations([]);
      setFilteredDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dests: Destination[], category: string, filters: typeof advancedFilters) => {
    let filtered = [...dests];

    if (category) {
      filtered = filtered.filter(d => {
        const categoryMatch = d.category && d.category.toLowerCase().trim() === category.toLowerCase().trim();
        if (categoryMatch) return true;
        return false;
      });
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }

    if (filters.crown) {
      filtered = filtered.filter(d => d.crown === true);
    }

    setFilteredDestinations(filtered);
    setCurrentPage(1);
  };

  const fetchVisitedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (error) throw error;

      const slugs = new Set((data || []).map((v: any) => v.destination_slug));
      setVisitedSlugs(slugs);
    } catch (err) {
      console.error('Error fetching visited places:', err);
    }
  };

  const handleDestinationClick = (destination: Destination) => {
    openIntelligentDrawer(destination);
  };

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
  const paginatedDestinations = filteredDestinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={() => router.push('/architects')}
              className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Back"
            >
              ← Back to Architects
            </button>

            <div className="mb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-light text-black dark:text-white mb-1">{architectName}</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters - Matching city page style */}
            <div className="space-y-4">
              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`transition-all duration-200 ease-out ${
                      !selectedCategory
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories
                    .slice()
                    .sort((a, b) => {
                      // Always put "others" at the end
                      if (a.toLowerCase() === 'others') return 1;
                      if (b.toLowerCase() === 'others') return -1;
                      return 0;
                    })
                    .map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`transition-all duration-200 ease-out ${
                        selectedCategory === category
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {capitalizeCategory(category)}
                    </button>
                  ))}
                </div>
              )}

              {/* Advanced Filters */}
              <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                <button
                  onClick={() => setAdvancedFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    advancedFilters.michelin
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  Michelin
                </button>
                <button
                  onClick={() => setAdvancedFilters(prev => ({ ...prev, crown: !prev.crown }))}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    advancedFilters.crown
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  Crown
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-sm text-gray-600 dark:text-gray-400">Loading destinations…</div>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-sm text-gray-600 dark:text-gray-400">No destinations found</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={paginatedDestinations}
                gap="sm"
                renderItem={(destination) => (
                  <DestinationCard
                    destination={destination}
                    onClick={() => handleDestinationClick(destination)}
                    isVisited={visitedSlugs.has(destination.slug)}
                    showBadges={true}
                  />
                )}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Destination Drawer - now handled by IntelligentDrawer in layout.tsx */}
    </>
  );
}

