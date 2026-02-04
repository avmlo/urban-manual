'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { FollowCityButton } from '@/components/FollowCityButton';
import { UniversalGrid } from '@/components/UniversalGrid';
import Image from 'next/image';
import { MultiplexAd } from '@/components/GoogleAd';
import { useItemsPerPage } from '@/hooks/useGridColumns';

interface CityStats {
  city: string;
  country: string;
  count: number;
  featuredImage?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CitiesPage() {
  const router = useRouter();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityStats[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = useItemsPerPage(4); // Items to add per "Show More" click
  const [displayCount, setDisplayCount] = useState(itemsPerPage); // Initial display count
  const [advancedFilters, setAdvancedFilters] = useState<{
    city?: string;
    category?: string;
    michelin?: boolean;
    crown?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    openNow?: boolean;
  }>({});
  const [countryCarouselIndex, setCountryCarouselIndex] = useState(0);

  useEffect(() => {
    fetchCityStats();
  }, []);

  useEffect(() => {
    applyFilters(cityStats, selectedCountry, advancedFilters);
  }, [selectedCountry, advancedFilters, cityStats]);

  const applyFilters = (cities: CityStats[], country: string, filters: typeof advancedFilters) => {
    let filtered = [...cities];
    
    // Country filter
    if (country) {
      filtered = filtered.filter(c => c.country === country);
    }
    
    setFilteredCities(filtered);
    // Reset display count when filters change
    setDisplayCount(itemsPerPage);
  };

  const fetchCityStats = async () => {
    try {
      // Fetch all destinations with images
      const { data, error } = await supabase
        .from('destinations')
        .select('city, image');

      if (error) throw error;

      const destinations = data as Destination[];
      
      // Count cities and get featured image (first destination with image)
      const cityData = destinations.reduce((acc, dest) => {
        if (!acc[dest.city]) {
          acc[dest.city] = {
            count: 0,
            featuredImage: dest.image || undefined,
          };
        }
        acc[dest.city].count += 1;
        // Update featured image if current one doesn't have image but this one does
        if (!acc[dest.city].featuredImage && dest.image) {
          acc[dest.city].featuredImage = dest.image;
        }
        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string }>);

      const stats = Object.entries(cityData)
        .map(([city, data]) => ({
          city,
          country: cityCountryMap[city] || 'Unknown',
          count: data.count,
          featuredImage: data.featuredImage,
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      setCityStats(stats);
      
      // Extract unique countries
      const uniqueCountries = Array.from(new Set(stats.map(s => s.country).filter(Boolean))) as string[];
      setCountries(uniqueCountries.sort());
      
      // Apply initial filtering
      applyFilters(stats, selectedCountry, advancedFilters);
    } catch (error) {
      console.error('Error fetching city stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading cities…</div>
        </div>
      </main>
    );
  }

  // Calculate featured cities (top 3 by count from all cities)
  const featuredCities = cityStats.slice(0, 3);

  // Country carousel logic
  const countriesPerView = 6;
  const maxCarouselIndex = Math.max(0, Math.ceil(countries.length / countriesPerView) - 1);
  const visibleCountries = countries.slice(
    countryCarouselIndex * countriesPerView,
    (countryCarouselIndex + 1) * countriesPerView
  );

  return (
    <main className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ease-out mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Discovery</span>
          </button>

          {/* Hero Content */}
          <div className="space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-black dark:text-white">
              Cities Around the World
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Explore destinations curated by locals and travelers. Each city tells a story through its places—from hidden cafes to celebrated landmarks.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {cityStats.length} cities • {countries.length} countries
            </p>
          </div>

          {/* Country Filter Panel */}
          {countries.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                    Explore by Country
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Select a country to discover its cities
                  </p>
                </div>
                {countries.length > countriesPerView && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCountryCarouselIndex(prev => Math.max(0, prev - 1))}
                      disabled={countryCarouselIndex === 0}
                      className="p-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous countries"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-900 dark:text-white" />
                    </button>
                    <button
                      onClick={() => setCountryCarouselIndex(prev => Math.min(maxCarouselIndex, prev + 1))}
                      disabled={countryCarouselIndex >= maxCarouselIndex}
                      className="p-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next countries"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-900 dark:text-white" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <button
                  onClick={() => {
                    setSelectedCountry("");
                    setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                    setCountryCarouselIndex(0);
                  }}
                  className={`text-xs font-medium transition-all duration-200 ease-out ${
                    !selectedCountry
                      ? "text-black dark:text-white"
                      : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
                >
                  All Countries
                </button>
                {visibleCountries.map((country) => (
                  <button
                    key={country}
                    onClick={() => {
                      const newCountry = country === selectedCountry ? "" : country;
                      setSelectedCountry(newCountry);
                      setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                    }}
                    className={`text-xs font-medium transition-all duration-200 ease-out ${
                      selectedCountry === country
                        ? "text-black dark:text-white"
                        : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Cities */}
          {featuredCities.length > 0 && !selectedCountry && (
            <div className="mb-12 pt-12 border-t border-gray-200 dark:border-gray-800">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-black dark:text-white">Featured Cities</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Most explored destinations this month
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredCities.map((cityData, idx) => {
                  const { city, country, count, featuredImage } = cityData;
                  return (
                    <button
                      key={city}
                      onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                      className="text-left group"
                    >
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800">
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={capitalizeCity(city)}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <MapPin className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-sm font-medium mb-1 text-black dark:text-white">{capitalizeCity(city)}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{country} • {count} places</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid Section */}
      <div className="pb-12 px-6 md:px-10 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {filteredCities.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-sm text-gray-600 dark:text-gray-400">No cities found</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={filteredCities.slice(0, displayCount)}
                gap="sm"
                renderItem={(cityData) => {
                  const { city, country, count, featuredImage } = cityData;
                  return (
                    <button
                      key={city}
                      onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                      className="text-left group"
                    >
                      {/* Square Image Container */}
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800 group-hover:opacity-80 transition-opacity">
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={capitalizeCity(city)}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={80}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <MapPin className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Count badge */}
                        <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-2 py-1 rounded-2xl text-xs font-medium border border-gray-200/50 dark:border-gray-700/50">
                          {count}
                        </div>
                        
                        {/* Follow button */}
                        <div className="absolute top-2 right-2">
                          <FollowCityButton 
                            citySlug={city}
                            cityName={capitalizeCity(city)}
                            variant="compact"
                            showLabel={false}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-black dark:text-white line-clamp-1">
                          {capitalizeCity(city)}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {country}
                        </p>
                      </div>
                    </button>
                  );
                }}
              />

              {/* Show More Button */}
              {displayCount < filteredCities.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                    className="px-6 py-3 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out text-gray-900 dark:text-white"
                  >
                    Show More ({filteredCities.length - displayCount} remaining)
                  </button>
                </div>
              )}

              {/* Horizontal Ad below pagination */}
              {filteredCities.length > 0 && (
                <div className="mt-8 w-full">
                  <div className="max-w-4xl mx-auto border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center uppercase tracking-wide">Sponsored</div>
                    <ins
                      className="adsbygoogle"
                      style={{ display: 'block', height: '90px' }}
                      data-ad-client="ca-pub-3052286230434362"
                      data-ad-slot="3271683710"
                      data-ad-format="horizontal"
                      data-full-width-responsive="false"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
