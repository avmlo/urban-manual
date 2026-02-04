'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { MultiplexAd } from '@/components/GoogleAd';
import { CityClock } from '@/components/CityClock';
import { useItemsPerPage } from '@/hooks/useGridColumns';

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  {
    ssr: false,
    loading: () => null,
  }
);

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

export default function CityPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const citySlug = decodeURIComponent(params.city as string);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows

  useEffect(() => {
    setLoading(true);
    fetchDestinations();
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
    setCurrentPage(1);
  }, [citySlug, user]);

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, advancedFilters);
    } else {
      setFilteredDestinations([]);
    }
  }, [destinations, selectedCategory, advancedFilters]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select(
          'slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, opening_hours, rating, tags'
        )
        .eq('city', citySlug)
        .order('name');

      if (error) throw error;

      const results = (data || []) as any[];
      setDestinations(results);

      // Count destinations per category and only show categories with at least 2 destinations
      const categoryCounts = new Map<string, number>();
      results.forEach((d: any) => {
        if (d.category) {
          categoryCounts.set(d.category, (categoryCounts.get(d.category) || 0) + 1);
        }
      });

      // Filter out quiet categories (categories with less than 2 destinations)
      const activeCategories = Array.from(categoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([category, _]) => category);

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
        
        // If category matches, include it
        if (categoryMatch) return true;
        
        // Also check tags for category-related matches
        const tags = d.tags || [];
        const categoryLower = category.toLowerCase().trim();
        
        // Map categories to relevant tag patterns
        const categoryTagMap: Record<string, string[]> = {
          'dining': ['restaurant', 'dining', 'fine-dining', 'italian_restaurant', 'mexican_restaurant', 'japanese_restaurant', 'french_restaurant', 'chinese_restaurant', 'thai_restaurant', 'indian_restaurant', 'seafood_restaurant', 'steak_house', 'pizza', 'food'],
          'cafe': ['cafe', 'coffee_shop', 'coffee', 'bakery', 'pastry'],
          'bar': ['bar', 'pub', 'cocktail_bar', 'wine_bar', 'beer', 'nightclub', 'lounge'],
          'hotel': ['hotel', 'lodging', 'resort', 'inn', 'hostel'],
          'shopping': ['store', 'shopping', 'mall', 'market', 'boutique'],
          'attraction': ['tourist_attraction', 'museum', 'park', 'landmark', 'monument'],
          'nightlife': ['nightclub', 'bar', 'pub', 'lounge', 'entertainment'],
        };
        
        // Get relevant tags for this category
        const relevantTags = categoryTagMap[categoryLower] || [];
        
        // Check if any tags match
        const tagMatch = tags.some(tag => {
          const tagLower = tag.toLowerCase();
          return relevantTags.some(relevantTag => 
            tagLower.includes(relevantTag) || relevantTag.includes(tagLower)
          );
        });
        
        return tagMatch;
      });
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

      const slugSet = new Set((data as any[])?.map((entry: any) => entry.destination_slug) || []);
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

  const cityDisplayName = capitalizeCity(citySlug);
  const country = cityCountryMap[citySlug] || '';

  const handleCategorySelect = (category: string) => {
    const nextCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(nextCategory);
    setAdvancedFilters(prev => ({ ...prev, category: nextCategory || undefined }));
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
          {/* Header - Minimal design matching homepage */}
          <div className="mb-12">
            <button
              onClick={() => router.push('/')}
              className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Back"
            >
              ← Back
            </button>

            <div className="mb-8">
              {country && (
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  {country}
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-light text-black dark:text-white mb-1">{cityDisplayName}</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                  </p>
                </div>
                <CityClock citySlug={citySlug} />
              </div>
            </div>

            {/* Filters - Matching homepage style */}
            <div className="space-y-4">
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
                  {categories.map(category => (
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
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                    onError={(e) => {
                      // Fallback to local file if external URL fails
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
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

          {/* Destinations Grid - Using UniversalGrid */}
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No destinations found in {cityDisplayName}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <UniversalGrid
                items={paginatedDestinations}
                renderItem={(destination, index) => {
                  const isVisited = !!(user && visitedSlugs.has(destination.slug));
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;

                  return (
                    <DestinationCard
                      key={destination.slug}
                      destination={destination}
                      onClick={() => {
                        setSelectedDestination(destination);
                        setIsDrawerOpen(true);
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
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
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
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Ad after grid */}
              <MultiplexAd slot="3271683710" />
            </div>
          )}
        </div>
      </main>

      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDestination(null);
        }}
        onSaveToggle={async (slug: string) => {
          if (!user) return;

          const { data } = await supabase
            .from('saved_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', slug)
            .single();

          if (data) {
            await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', slug);
          } else {
            await (supabase.from('saved_places').insert as any)({ user_id: user.id, destination_slug: slug });
          }
        }}
        onVisitToggle={async (slug: string, visited: boolean) => {
          if (!user) return;

          // Update local state based on the visited parameter
          setVisitedSlugs(prev => {
            const next = new Set(prev);
            if (visited) {
              next.add(slug);
            } else {
              next.delete(slug);
            }
            return next;
          });

          // The DestinationDrawer already handles the database update,
          // so we just need to sync our local state
        }}
      />
    </>
  );
}
