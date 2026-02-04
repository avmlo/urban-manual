'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { Sparkles, MapPin, TrendingUp, Crown, Star, ChevronRight } from 'lucide-react';

interface CategoryStat {
  category: string;
  count: number;
  icon: string;
}

interface CityStat {
  city: string;
  count: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍸',
  hotel: '🏨',
  shop: '🛍️',
  bakery: '🥐',
};

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ExplorePage() {
  const router = useRouter();
  const [featuredDestinations, setFeaturedDestinations] = useState<Destination[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [popularCities, setPopularCities] = useState<CityStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    try {
      // Fetch all destinations
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('name');

      if (error) throw error;

      const destinations = data as Destination[];

      // Featured destinations (crown or michelin stars)
      const featured = destinations
        .filter(d => d.crown || (d.michelin_stars && d.michelin_stars > 0))
        .slice(0, 6);
      setFeaturedDestinations(featured);

      // Category stats
      const categoryCounts = destinations.reduce((acc, dest) => {
        const cat = dest.category?.toLowerCase() || 'other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryArray = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          icon: CATEGORY_ICONS[category] || '📍',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setCategoryStats(categoryArray);

      // Popular cities
      const cityCounts = destinations.reduce((acc, dest) => {
        acc[dest.city] = (acc[dest.city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const cityArray = Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setPopularCities(cityArray);

    } catch (error) {
      console.error('Error fetching explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
            <div className="h-6 w-96 bg-gray-200 dark:bg-gray-800 rounded mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Explore</h1>
          </div>
          <span className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            Discover destinations by category, city, or browse our curated collections
          </span>
        </div>

        {/* Categories Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryStats.map((stat, index) => (
              <button
                key={stat.category}
                onClick={() => router.push(`/?category=${stat.category}`)}
                className="group p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <h3 className="font-bold text-sm mb-1 capitalize">{stat.category}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.count} {stat.count === 1 ? 'place' : 'places'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Destinations */}
        {featuredDestinations.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Crown className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">Featured Destinations</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {featuredDestinations.map((dest, index) => (
                <button
                  key={dest.slug}
                  onClick={() => router.push(`/destination/${dest.slug}`)}
                  className="group text-left animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-2xl mb-2">
                    {dest.image ? (
                      <img
                        src={dest.image}
                        alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                        <MapPin className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    {/* Crown Badge */}
                    {dest.crown && (
                      <div className="absolute top-2 left-2 text-xl">👑</div>
                    )}
                    {/* Michelin Stars */}
                    {dest.michelin_stars && dest.michelin_stars > 0 && (
                      <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{dest.michelin_stars}</span>
                      </div>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="space-y-0.5">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 text-black dark:text-white">
                      {dest.name}
                    </h3>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {capitalizeCity(dest.city)} • {dest.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular Cities */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Popular Cities</h2>
            </div>
            <button
              onClick={() => router.push('/cities')}
              className="text-sm font-bold hover:opacity-60 transition-opacity flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {popularCities.map((city, index) => (
              <button
                key={city.city}
                onClick={() => router.push(`/city/${encodeURIComponent(city.city)}`)}
                className="group p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <span className="text-2xl font-bold text-black dark:text-white">{city.count}</span>
                </div>
                <h3 className="font-bold text-base mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {capitalizeCity(city.city)}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {city.count === 1 ? '1 place' : `${city.count} places`}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
