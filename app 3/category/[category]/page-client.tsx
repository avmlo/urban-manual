'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, SlidersHorizontal } from 'lucide-react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import Image from 'next/image';
import { SearchFiltersComponent, SearchFilters } from '@/src/features/search/SearchFilters';
import dynamic from 'next/dynamic';

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

interface CategoryPageClientProps {
  category: string;
}

export default function CategoryPageClient({ category }: CategoryPageClientProps) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [cities, setCities] = useState<string[]>([]);
  const [categories] = useState<string[]>(['Hotels', 'Restaurants', 'Cafes', 'Bars', 'Shops', 'Museums']);

  const categoryName = category.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  useEffect(() => {
    fetchDestinations();
  }, [category]);

  useEffect(() => {
    applyFilters();
  }, [filters, destinations]);

  async function fetchDestinations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .ilike('category', categoryName);

      if (error) throw error;

      setDestinations(data || []);
      
      // Extract unique cities
      const uniqueCities = Array.from(new Set((data || []).map(d => d.city)));
      setCities(uniqueCities.sort());
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...destinations];

    if (filters.city) {
      filtered = filtered.filter(d => d.city === filters.city);
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }

    if (filters.crown) {
      filtered = filtered.filter(d => d.crown);
    }

    if (filters.minPrice) {
      filtered = filtered.filter(d => d.price_level && d.price_level >= filters.minPrice!);
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(d => d.price_level && d.price_level <= filters.maxPrice!);
    }

    if (filters.minRating) {
      filtered = filtered.filter(d => d.rating && d.rating >= filters.minRating!);
    }

    setFilteredDestinations(filtered);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading destinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="w-full px-6 md:px-10 lg:px-12 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{categoryName}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center justify-between">
          <div className="relative">
            <SearchFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              availableCities={cities}
              availableCategories={categories}
            />
          </div>
        </div>

        {/* Destinations Grid */}
        {filteredDestinations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No destinations found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredDestinations.map((destination, index) => (
              <button
                key={destination.slug}
                onClick={() => {
                  setSelectedDestination(destination);
                  setIsDrawerOpen(true);
                }}
                className={`${CARD_WRAPPER} group text-left`}
              >
                <div className={`${CARD_MEDIA} mb-2 relative overflow-hidden`}>
                  {(destination.image_thumbnail || destination.image) ? (
                    <Image
                      src={destination.image_thumbnail || destination.image!}
                      alt={destination.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      quality={80}
                      loading={index < 8 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg">
                      <span>⭐</span>
                      <span>{destination.michelin_stars}</span>
                    </div>
                  )}
                </div>
                <div className={`${CARD_TITLE}`} role="heading" aria-level={3}>
                  {destination.name}
                </div>
                <div className={CARD_META}>
                  <MapPin className="h-3 w-3" />
                  <span>{destination.city}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <DestinationDrawer
          destination={selectedDestination}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedDestination(null);
          }}
        />
      </main>
    </div>
  );
}

