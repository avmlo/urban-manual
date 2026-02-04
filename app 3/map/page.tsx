'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import { Search, X, List, ChevronRight } from 'lucide-react';
import Image from 'next/image';

// Lazy load components
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

interface FilterState {
  categories: Set<string>;
  michelin: boolean;
  searchQuery: string;
}

export default function MapPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    categories: new Set(),
    michelin: false,
    searchQuery: '',
  });
  const [showListPanel, setShowListPanel] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 23.5, lng: 121.0 }); // Taiwan center
  const [mapZoom, setMapZoom] = useState(8);

  // Fetch destinations and categories
  useEffect(() => {
    async function fetchData() {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('[Map Page] Supabase client not available');
          setLoading(false);
          return;
        }

        // Fetch destinations with location data
        const { data: destData, error: destError } = await supabaseClient
          .from('destinations')
          .select('id, slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id, rating')
          .is('parent_destination_id', null)
          .or('latitude.not.is.null,longitude.not.is.null,place_id.not.is.null')
          .order('name')
          .limit(1000);

        if (destError) {
          console.warn('[Map Page] Error fetching destinations:', destError);
          setDestinations([]);
        } else {
          setDestinations((destData || []) as Destination[]);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set((destData || []).map((d: any) => d.category).filter(Boolean))
          ) as string[];
          setCategories(uniqueCategories.sort());
        }
      } catch (error) {
        console.warn('[Map Page] Exception fetching data:', error);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter destinations
  const filteredDestinations = useMemo(() => {
    let filtered = [...destinations];

    // Category filter
    if (filters.categories.size > 0) {
      filtered = filtered.filter(d => 
        d.category && filters.categories.has(d.category.toLowerCase())
      );
    }

    // Michelin filter
    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.name?.toLowerCase().includes(query) ||
        d.city?.toLowerCase().includes(query) ||
        d.category?.toLowerCase().includes(query) ||
        d.neighborhood?.toLowerCase().includes(query) ||
        d.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [destinations, filters]);

  // Calculate map center from filtered destinations
  useEffect(() => {
    const destinationsWithCoords = filteredDestinations.filter(d => d.latitude && d.longitude);
    if (destinationsWithCoords.length > 0) {
      const avgLat = destinationsWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / destinationsWithCoords.length;
      const avgLng = destinationsWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / destinationsWithCoords.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [filteredDestinations]);

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => {
      const newCategories = new Set(prev.categories);
      if (newCategories.has(category.toLowerCase())) {
        newCategories.delete(category.toLowerCase());
      } else {
        newCategories.add(category.toLowerCase());
      }
      return { ...prev, categories: newCategories };
    });
  };

  const handleMarkerClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
  }, []);

  const handleListItemClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
  }, []);

  // Calculate distance from map center (simplified)
  const getDistanceFromCenter = (dest: Destination): number => {
    if (!dest.latitude || !dest.longitude) return Infinity;
    // Simple distance calculation (Haversine would be more accurate)
    const latDiff = Math.abs(dest.latitude - mapCenter.lat);
    const lngDiff = Math.abs(dest.longitude - mapCenter.lng);
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  };

  // Sort destinations by distance from center
  const sortedDestinations = useMemo(() => {
    return [...filteredDestinations].sort((a, b) => {
      const distA = getDistanceFromCenter(a);
      const distB = getDistanceFromCenter(b);
      return distA - distB;
    });
  }, [filteredDestinations, mapCenter]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading map…</div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Filters Bar - Top (below header) */}
      <div className="sticky top-[112px] left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 safe-area-top">
        <div className="w-full px-6 md:px-10 lg:px-12 py-4 md:py-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Search cities, places, vibes…"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Chips - Scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-4 py-2 rounded-2xl text-xs font-medium border transition-all duration-200 ease-out whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                    filters.categories.has(category.toLowerCase())
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:opacity-60'
                  }`}
                >
                  {category}
                </button>
              ))}
              
              {/* Michelin Filter */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                className={`px-4 py-2 rounded-2xl text-xs font-medium border transition-all duration-200 ease-out flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                  filters.michelin
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:opacity-60'
                }`}
              >
                <img
                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                  alt="Michelin"
                  className="h-3 w-3"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== '/michelin-star.svg') {
                      target.src = '/michelin-star.svg';
                    }
                  }}
                />
                Michelin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List Panel - Left (Desktop) */}
      {showListPanel && (
        <div className="hidden md:block fixed left-0 top-[calc(112px+120px)] bottom-0 w-[380px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-20 overflow-y-auto">
          <div className="p-6 space-y-3">
            <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
              {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
            </div>
            {sortedDestinations.map((dest) => (
              <button
                key={dest.slug}
                onClick={() => handleListItemClick(dest)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ease-out text-left ${
                  selectedDestination?.slug === dest.slug
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:opacity-60'
                }`}
              >
                {dest.image && (
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-800">
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{dest.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {dest.category && <span>{dest.category}</span>}
                    {dest.city && (
                      <span className="ml-1">• {dest.city}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map - Full width with margin for list panel */}
      <div className={`w-full ${showListPanel ? 'md:ml-[380px]' : ''} mt-[120px]`} style={{ height: 'calc(100vh - 112px - 120px)', minHeight: '600px' }}>
        <MapView
          destinations={filteredDestinations}
          onMarkerClick={handleMarkerClick}
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>

      {/* List Panel - Mobile (Bottom Sheet) */}
      {showListPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-20 top-[calc(112px+120px)]"
            onClick={() => setShowListPanel(false)}
          />
          {/* Panel */}
          <div className="md:hidden fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-30 overflow-hidden rounded-t-2xl shadow-2xl safe-area-bottom"
            style={{ 
              height: 'min(50vh, 400px)',
              maxHeight: '50vh'
            }}>
            {/* Handle bar with close button */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {filteredDestinations.length} {filteredDestinations.length === 1 ? 'place' : 'places'}
                </span>
              </div>
              <button
                onClick={() => setShowListPanel(false)}
                className="p-2 rounded-2xl hover:opacity-60 transition-opacity"
                aria-label="Close list"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {/* Scrollable list */}
            <div className="overflow-y-auto h-[calc(100%-65px)]">
              <div className="p-6 space-y-3 pb-6">
                {sortedDestinations.map((dest) => (
                  <button
                    key={dest.slug}
                    onClick={() => {
                      handleListItemClick(dest);
                      setShowListPanel(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:opacity-60 transition-all duration-200 ease-out text-left min-h-[72px] touch-manipulation"
                  >
                    {dest.image && (
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-800">
                        <Image
                          src={dest.image}
                          alt={dest.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{dest.name}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {dest.category && <span>{dest.category}</span>}
                        {dest.city && (
                          <span className="ml-1">• {dest.city}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* List Toggle Button - Mobile (Floating) */}
      {!showListPanel && (
        <button
          onClick={() => setShowListPanel(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white rounded-2xl text-xs font-medium hover:opacity-60 transition-all duration-200 ease-out shadow-lg min-h-[44px] safe-area-bottom"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }}
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Show List ({filteredDestinations.length})</span>
          </div>
        </button>
      )}

      {/* Destination Drawer */}
      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setTimeout(() => setSelectedDestination(null), 300);
        }}
      />
    </div>
  );
}
