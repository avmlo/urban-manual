'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Navigation, Sparkles, Calendar, Download, Loader2, Utensils, Coffee } from 'lucide-react';

interface Destination {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  latitude?: number;
  longitude?: number;
}

interface OptimizedStop {
  destination: Destination;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  travelTimeToNext?: number; // minutes
  travelMode?: string;
  type: 'destination' | 'meal' | 'break';
}

export default function RouteOptimizerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedPlaces, setSavedPlaces] = useState<Destination[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Destination[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [selectedCity, setSelectedCity] = useState('');
  const travelTimeCacheRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSavedPlaces();
    }
  }, [user]);

  const fetchSavedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_places')
        .select(`
          destination_slug,
          destinations (
            slug,
            name,
            city,
            category,
            image,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const places: Destination[] = [];
      if (data) {
        for (const item of data as any[]) {
          if ((item as any).destinations && typeof (item as any).destinations === 'object' && !Array.isArray((item as any).destinations)) {
            places.push((item as any).destinations as Destination);
          }
        }
      }

      setSavedPlaces(places || []);

      // Auto-select first city
      if (places.length > 0) {
        setSelectedCity(places[0].city);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVisitDuration = (category: string): number => {
    // Estimated visit durations in minutes
    const durations: Record<string, number> = {
      'Restaurant': 90,
      'Restaurants': 90,
      'Hotels': 30,
      'Culture': 120,
      'Bars': 60,
      'Cafes': 45,
      'Bakeries': 20,
      'Other': 60,
    };
    return durations[category] || 60;
  };

  const getFallbackTravelTime = () => Math.floor(Math.random() * 15) + 15;

  const getLegKey = (fromSlug: string, toSlug: string) => `${fromSlug}->${toSlug}`;

  const estimateTravelTimes = async (
    legs: Array<{ from: Destination; to: Destination; mode?: string }>
  ): Promise<Map<string, number>> => {
    const cache = travelTimeCacheRef.current;
    const results = new Map<string, number>();

    if (legs.length === 0) {
      return results;
    }

    const pendingLegs: Array<{ from: Destination; to: Destination; mode?: string }> = [];

    legs.forEach((leg) => {
      const key = getLegKey(leg.from.slug, leg.to.slug);
      if (
        !leg.from.latitude ||
        !leg.from.longitude ||
        !leg.to.latitude ||
        !leg.to.longitude
      ) {
        const fallback = getFallbackTravelTime();
        cache.set(key, fallback);
        results.set(key, fallback);
        return;
      }

      if (cache.has(key)) {
        results.set(key, cache.get(key)!);
      } else {
        pendingLegs.push(leg);
      }
    });

    if (pendingLegs.length === 0) {
      return results;
    }

    const requestedMode = pendingLegs[0]?.mode || 'walking';
    const uniqueOrigins = Array.from(
      new Map(pendingLegs.map((leg) => [leg.from.slug, leg.from])).values()
    );
    const uniqueDestinations = Array.from(
      new Map(pendingLegs.map((leg) => [leg.to.slug, leg.to])).values()
    );

    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: uniqueOrigins.map((origin) => ({
            lat: origin.latitude!,
            lng: origin.longitude!,
            name: origin.slug,
          })),
          destinations: uniqueDestinations.map((destination) => ({
            lat: destination.latitude!,
            lng: destination.longitude!,
            name: destination.slug,
          })),
          mode: requestedMode,
        }),
      });

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result: { from: string; to: string; duration: number }) => {
          const key = getLegKey(result.from, result.to);
          const durationInMinutes = Math.ceil(result.duration / 60);
          cache.set(key, durationInMinutes);
          results.set(key, durationInMinutes);
        });
      }
    } catch (error) {
      console.error('Error fetching travel times:', error);
    }

    pendingLegs.forEach((leg) => {
      const key = getLegKey(leg.from.slug, leg.to.slug);
      if (!results.has(key)) {
        const fallback = getFallbackTravelTime();
        cache.set(key, fallback);
        results.set(key, fallback);
      }
    });

    return results;
  };

  const shouldInsertMeal = (currentTime: Date, lastMealTime: Date | null, type: 'lunch' | 'dinner'): boolean => {
    if (!lastMealTime) {
      const hours = currentTime.getHours();
      if (type === 'lunch' && hours >= 12 && hours < 14) return true;
      if (type === 'dinner' && hours >= 18 && hours < 20) return true;
    }
    return false;
  };

  const optimizeRoute = async () => {
    if (selectedPlaces.length === 0) return;

    setOptimizing(true);

    try {
      // Parse start time
      const [hours, minutes] = startTime.split(':').map(Number);
      let currentTime = new Date();
      currentTime.setHours(hours, minutes, 0, 0);

      const route: OptimizedStop[] = [];
      let lastMealTime: Date | null = null;

      // Sort places by category for balanced itinerary
      const sortedPlaces = [...selectedPlaces].sort((a, b) => {
        const priority: Record<string, number> = {
          'Cafes': 1,
          'Bakeries': 1,
          'Culture': 2,
          'Restaurant': 3,
          'Restaurants': 3,
          'Bars': 4,
          'Hotels': 5,
        };
        return (priority[a.category] || 3) - (priority[b.category] || 3);
      });

      const legs = sortedPlaces.slice(0, -1).map((place, index) => ({
        from: place,
        to: sortedPlaces[index + 1],
        mode: 'walking',
      }));

      const travelTimeMap = await estimateTravelTimes(legs);

      for (let index = 0; index < sortedPlaces.length; index++) {
        const place = sortedPlaces[index];

        // Check if we should insert lunch
        if (shouldInsertMeal(currentTime, lastMealTime, 'lunch') &&
            !place.category.includes('Restaurant')) {
          const lunchPlace = savedPlaces.find(p =>
            p.city === selectedCity &&
            (p.category.includes('Restaurant'))
          );

          if (lunchPlace) {
            const lunchDuration = 60;
            const endTime = new Date(currentTime.getTime() + lunchDuration * 60000);

            route.push({
              destination: lunchPlace,
              startTime: currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              duration: lunchDuration,
              type: 'meal',
            });

            currentTime = endTime;
            lastMealTime = currentTime;
          }
        }

        // Add main destination
        const duration = getVisitDuration(place.category);
        const endTime = new Date(currentTime.getTime() + duration * 60000);

        const travelTime = index < sortedPlaces.length - 1
          ? travelTimeMap.get(getLegKey(place.slug, sortedPlaces[index + 1].slug))
          : undefined;

        route.push({
          destination: place,
          startTime: currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          duration,
          travelTimeToNext: travelTime,
          travelMode: 'walking',
          type: 'destination',
        });

        // Update current time (including travel)
        currentTime = new Date(endTime.getTime() + (travelTime || 0) * 60000);
      }

      setOptimizedRoute(route);
    } catch (error) {
      console.error('Error optimizing route:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const exportToGoogleMaps = () => {
    if (optimizedRoute.length === 0) return;

    const waypoints = optimizedRoute
      .filter(stop => stop.type === 'destination')
      .map(stop => encodeURIComponent(stop.destination.name))
      .join('/');

    const url = `https://www.google.com/maps/dir/${waypoints}`;
    window.open(url, '_blank');
  };

  const togglePlace = (place: Destination) => {
    if (selectedPlaces.find(p => p.slug === place.slug)) {
      setSelectedPlaces(selectedPlaces.filter(p => p.slug !== place.slug));
    } else {
      setSelectedPlaces([...selectedPlaces, place]);
    }
  };

  const cityPlaces = savedPlaces.filter(p => p.city === selectedCity);
  const cities = Array.from(new Set(savedPlaces.map(p => p.city)));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold">Route Optimizer</h1>
          </div>
          <span className="text-base text-gray-600 dark:text-gray-400">
            AI-powered trip planning • Drag places to create your perfect day
          </span>
        </div>

        {savedPlaces.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <span className="text-xl text-gray-400 mb-6">No saved places yet</span>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
            >
              Browse Destinations
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Selection */}
            <div className="space-y-6">
              {/* City Selector */}
              <div>
                <label className="block text-sm font-medium mb-3">Select City</label>
                <div className="flex flex-wrap gap-2">
                  {cities.map(city => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setSelectedPlaces([]);
                        setOptimizedRoute([]);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCity === city
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-md'
                      }`}
                    >
                      {city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium mb-3">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              {/* Places Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select Places ({selectedPlaces.length} selected)
                </label>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {cityPlaces.map(place => {
                    const isSelected = selectedPlaces.find(p => p.slug === place.slug);
                    return (
                      <button
                        key={place.slug}
                        onClick={() => togglePlace(place)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {place.image && (
                            <img
                              src={place.image}
                              alt={place.name}
                              className="w-12 h-12 rounded-2xl object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{place.name}</div>
                            <div className={`text-sm ${isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-500'}`}>
                              {place.category}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optimize Button */}
              <button
                onClick={optimizeRoute}
                disabled={selectedPlaces.length === 0 || optimizing}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Optimizing route...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Optimize My Day</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Optimized Route */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Optimized Route</h2>
                {optimizedRoute.length > 0 && (
                  <button
                    onClick={exportToGoogleMaps}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export to Maps</span>
                  </button>
                )}
              </div>

              {optimizedRoute.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <span>Select places and click "Optimize My Day"</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {optimizedRoute.map((stop, index) => (
                    <div key={index} className="relative">
                      <div className="flex gap-4">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            stop.type === 'meal'
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            {stop.type === 'meal' ? (
                              <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                            ) : (
                              <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                            )}
                          </div>
                          {index < optimizedRoute.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-800 min-h-[60px]" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="font-bold text-lg">{stop.destination.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {stop.destination.category}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{stop.startTime} - {stop.endTime}</span>
                            </div>
                            <div className="text-gray-500">
                              ({stop.duration} min)
                            </div>
                          </div>

                          {stop.travelTimeToNext && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Navigation className="h-4 w-4" />
                              <span>{stop.travelTimeToNext} min {stop.travelMode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Duration</span>
                      <span className="font-bold">
                        {Math.floor(optimizedRoute.reduce((sum, stop) => sum + stop.duration + (stop.travelTimeToNext || 0), 0) / 60)}h {optimizedRoute.reduce((sum, stop) => sum + stop.duration + (stop.travelTimeToNext || 0), 0) % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">Stops</span>
                      <span className="font-bold">{optimizedRoute.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
