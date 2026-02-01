'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { Brand } from '@/types/architecture';
import Image from 'next/image';

/**
 * Props for the BrandPageClient component
 * Initial data is fetched server-side for faster loading
 */
export interface BrandPageClientProps {
  brand: string;
  brandData?: Brand | null;
  initialDestinations?: Destination[];
  initialCategories?: string[];
  initialCities?: string[];
}

// IntelligentDrawer for destination details
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function BrandPageClient({
  brand,
  brandData,
  initialDestinations = [],
  initialCategories = [],
  initialCities = [],
}: BrandPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Track whether we have SSR data
  const hasSSRData = initialDestinations.length > 0;

  // Initialize state with SSR data if available
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(initialDestinations);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [cities, setCities] = useState<string[]>(initialCities);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  // Skip loading state if we have SSR data
  const [loading, setLoading] = useState(!hasSSRData);
  // Drawer now handled by IntelligentDrawer
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows

  const { openDrawer } = useDrawer();

  useEffect(() => {
    // Skip fetching destinations if we have SSR data
    if (!hasSSRData) {
      setLoading(true);
      fetchDestinations();
    }
    // Always fetch user-specific data
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
    setCurrentPage(1);
  }, [brand, user, hasSSRData]);

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, selectedCity, advancedFilters);
    } else {
      setFilteredDestinations([]);
    }
  }, [destinations, selectedCategory, selectedCity, advancedFilters]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select(
          'slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, opening_hours_json, rating, tags, brand'
        )
        .ilike('brand', brand)
        .order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const results = (data || []) as Destination[];
      setDestinations(results);

      // Count destinations per category (case-insensitive) and only show categories with at least 2 destinations
      const categoryCounts = new Map<string, number>();
      const categoryOriginalCase = new Map<string, string>();
      results.forEach((d) => {
        if (d.category) {
          const categoryLower = d.category.toLowerCase();
          if (!categoryOriginalCase.has(categoryLower)) {
            categoryOriginalCase.set(categoryLower, d.category);
          }
          categoryCounts.set(categoryLower, (categoryCounts.get(categoryLower) || 0) + 1);
        }
      });

      const activeCategories = Array.from(categoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([categoryLower]) => categoryOriginalCase.get(categoryLower) || categoryLower);

      setCategories(activeCategories);

      // Extract unique cities
      const citySet = new Set<string>();
      results.forEach((d) => {
        if (d.city) {
          citySet.add(d.city);
        }
      });
      setCities(Array.from(citySet).sort());

      applyFilters(results, selectedCategory, selectedCity, advancedFilters);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinations([]);
      setFilteredDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dests: Destination[], category: string, city: string, filters: typeof advancedFilters) => {
    let filtered = [...dests];

    if (category) {
      filtered = filtered.filter(d => d.category && d.category.toLowerCase().trim() === category.toLowerCase().trim());
    }

    if (city) {
      filtered = filtered.filter(d => d.city === city);
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }
    if (filters.crown) {
      filtered = filtered.filter(d => d.crown);
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

      const slugSet = new Set((data as { destination_slug: string }[])?.map((entry) => entry.destination_slug) || []);
      setVisitedSlugs(slugSet);
    } catch (err) {
      console.error('Error fetching visited destinations:', err);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  const handleCategorySelect = (category: string) => {
    const nextCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(nextCategory);
  };

  const handleCitySelect = (city: string) => {
    const nextCity = city === selectedCity ? '' : city;
    setSelectedCity(nextCity);
  };

  const paginatedDestinations = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDestinations.slice(start, end);
  })();

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  return (
    <>
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={() => router.push('/brands')}
              className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Back to brands"
            >
              ← All Brands
            </button>

            <div className="mb-8">
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Brand
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Brand Logo */}
                  {brandData?.logo_url && (
                    <div className="flex-shrink-0">
                      <Image
                        src={brandData.logo_url}
                        alt={`${brand} logo`}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-contain rounded-lg bg-white dark:bg-gray-800 p-2"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-light text-black dark:text-white mb-1">{brand}</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                      {cities.length > 0 && ` in ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}`}
                    </p>
                    {brandData?.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
                        {brandData.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              {/* City Filter */}
              {cities.length > 1 && (
                <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => handleCitySelect('')}
                    className={`transition-all duration-200 ease-out ${
                      !selectedCity
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Cities
                  </button>
                  {cities.map(city => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`transition-all duration-200 ease-out ${
                        selectedCity === city
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {capitalizeCity(city)}
                    </button>
                  ))}
                </div>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => handleCategorySelect('')}
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
                      if (a.toLowerCase() === 'others') return 1;
                      if (b.toLowerCase() === 'others') return -1;
                      return 0;
                    })
                    .map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
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

          {/* Destinations Grid */}
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No destinations found for {brand}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <UniversalGrid
                items={paginatedDestinations}
                renderItem={(destination: Destination, index: number) => {
                  const isVisited = !!(user && visitedSlugs.has(destination.slug));
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;

                    return (
                      <DestinationCard
                        key={destination.slug}
                        destination={destination}
                        onClick={() => {
                          openIntelligentDrawer(destination);
                          openDrawer('destination');
                        }}
                        index={globalIndex}
                        isVisited={isVisited}
                        showBadges={true}
                      />
                    );
                }}
                emptyState={
                  <div className="text-center py-20">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No destinations found
                    </p>
                  </div>
                }
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNumber: number;

                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = currentPage - 2 + index;
                      }

                      const isActive = currentPage === pageNumber;

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                          }`}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
