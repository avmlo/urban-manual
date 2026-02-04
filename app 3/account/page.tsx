'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Heart, Check, Plus, Calendar, Trash2, Edit2 } from "lucide-react";
import { cityCountryMap } from "@/data/cityCountryMap";
import Image from "next/image";
import { EnhancedVisitedTab } from "@/components/EnhancedVisitedTab";
import { EnhancedSavedTab } from "@/components/EnhancedSavedTab";
import { WorldMapVisualization } from "@/components/WorldMapVisualization";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { PageLoader } from "@/components/LoadingStates";
import { NoCollectionsEmptyState } from "@/components/EmptyStates";
import { ProfileEditor } from "@/components/ProfileEditor";
import ProfileAvatar from "@/components/ProfileAvatar";
import { TripPlanner } from "@/components/TripPlanner";
import { AccountPrivacyManager } from "@/components/AccountPrivacyManager";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Get initial tab from URL query param - use useEffect to avoid SSR issues
  const [activeTab, setActiveTab] = useState<'profile' | 'visited' | 'saved' | 'collections' | 'achievements' | 'settings' | 'trips'>('profile');
  
  // Update tab from URL params after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['profile', 'visited', 'saved', 'collections', 'achievements', 'settings', 'trips'].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, []);
  const [totalDestinations, setTotalDestinations] = useState(0);

  // Collection creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(true);
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Trip management state
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthChecked(true);
        setIsLoadingData(false);
        return;
      }

      setUser(session.user);
      const role = (session.user.app_metadata as Record<string, any> | undefined)?.role;
      setIsAdmin(role === 'admin');
      setAuthChecked(true);
    }

    checkAuth();
  }, []);

  // Fetch total destinations count
  useEffect(() => {
    async function fetchTotalDestinations() {
      try {
        const { count } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true });
        setTotalDestinations(count || 0);
      } catch (error) {
        console.error('Error fetching total destinations:', error);
      }
    }
    fetchTotalDestinations();
  }, []);

  // Load user data - extracted as a function to be callable
  const loadUserData = useCallback(async () => {
    if (!user) {
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      // Load saved, visited, collections, and trips
      const [savedResult, visitedResult, collectionsResult, tripsResult] = await Promise.all([
        supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', user.id),
        supabase
          .from('visited_places')
          .select('destination_slug, visited_at, rating, notes')
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false }),
        supabase
          .from('collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      // Collect all unique slugs
      const allSlugs = new Set<string>();
      if (savedResult.data) {
        (savedResult.data as any[]).forEach((item: any) => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as any[]).forEach((item: any) => allSlugs.add(item.destination_slug));
      }

      // Fetch destinations with location data for map
      if (allSlugs.size > 0) {
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          // Map saved places
          if (savedResult.data) {
            setSavedPlaces((savedResult.data as any[]).map((item: any) => {
              const dest = (destData as any[]).find((d: any) => d.slug === item.destination_slug);
              return dest ? {
                destination_slug: dest.slug,
                destination: {
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image
                }
              } : null;
            }).filter((item: any) => item !== null));
          }

          // Map visited places
          if (visitedResult.data) {
            setVisitedPlaces((visitedResult.data as any[]).map((item: any) => {
              const dest = (destData as any[]).find((d: any) => d.slug === item.destination_slug);
              return dest ? {
                destination_slug: item.destination_slug,
                visited_at: item.visited_at,
                rating: item.rating,
                notes: item.notes,
                destination: {
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                  country: dest.country
                }
              } : null;
            }).filter((item: any) => item !== null));
          }
        }
      }

      // Set collections
      if (collectionsResult.data) {
        setCollections(collectionsResult.data);
      }

      // Set trips
      if (tripsResult.data) {
        setTrips(tripsResult.data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    setCreatingCollection(true);
    try {
      // Use API endpoint for better error handling and RLS compliance
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || null,
          is_public: newCollectionPublic,
          emoji: '📚',
          color: '#3B82F6',
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.details || 'Failed to create collection';
        throw new Error(errorMessage);
      }

      // Response is ok, extract collection data
      const data = responseData.collection;

      if (!data) {
        throw new Error('Invalid response from server');
      }

      // Add new collection to list and reload to ensure consistency
      setCollections([data, ...collections]);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionPublic(true);
      setShowCreateModal(false);
      
      // Reload collections to ensure we have the latest data
      await loadUserData();
    } catch (error: any) {
      console.error('Error creating collection:', error);
      alert(error.message || 'Failed to create collection. Please try again.');
    } finally {
      setCreatingCollection(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter(Boolean),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    // Get countries from destination.country field first, fallback to cityCountryMap
    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter(Boolean),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country)
    ]);
    
    // Also get countries from city mapping for destinations without country field
    // Normalize city names to match cityCountryMap format (lowercase, hyphenated)
    const countriesFromCities = Array.from(uniqueCities)
      .map(city => {
        if (!city) return null;
        // Try exact match first
        let country = cityCountryMap[city];
        if (country) return country;
        
        // Try lowercase match
        const cityLower = city.toLowerCase();
        country = cityCountryMap[cityLower];
        if (country) return country;
        
        // Try hyphenated version (e.g., "New York" -> "new-york")
        const cityHyphenated = cityLower.replace(/\s+/g, '-');
        country = cityCountryMap[cityHyphenated];
        if (country) return country;
        
        // Try without hyphens (e.g., "new-york" -> "newyork" - less common but possible)
        const cityNoHyphens = cityLower.replace(/-/g, '');
        country = cityCountryMap[cityNoHyphens];
        
        return country || null;
      })
      .filter(Boolean);
    
    const uniqueCountries = new Set([
      ...Array.from(countriesFromDestinations),
      ...countriesFromCities
    ]);
    
    // Extract visited destinations with coordinates for map
    const visitedDestinationsWithCoords = visitedPlaces
      .filter(p => p.destination)
      .map(p => ({
        city: p.destination!.city,
        latitude: p.destination!.latitude,
        longitude: p.destination!.longitude,
      }))
      .filter(d => d.latitude && d.longitude);

    // Debug logging to help diagnose map issues
    console.log('[Account] Countries found:', Array.from(uniqueCountries));
    console.log('[Account] Countries from destinations:', Array.from(countriesFromDestinations));
    console.log('[Account] Countries from cities:', countriesFromCities);
    console.log('[Account] Unique cities:', Array.from(uniqueCities));
    console.log('[Account] Visited places count:', visitedPlaces.length);
    console.log('[Account] Visited destinations with coords:', visitedDestinationsWithCoords.length);

    const curationCompletionPercentage = totalDestinations > 0
      ? Math.round((visitedPlaces.length / totalDestinations) * 100)
      : 0;

    return {
      uniqueCities,
      uniqueCountries,
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      collectionsCount: collections.length,
      curationCompletionPercentage,
      visitedDestinationsWithCoords
    };
  }, [savedPlaces, visitedPlaces, collections, totalDestinations]);

  // Show loading
  if (!authChecked || isLoadingData) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  // Show sign in screen
  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Account</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to save places, track visits, and create collections
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full">
        {/* Header - Matches homepage spacing and style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Account</h1>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        {/* Tab Navigation - Minimal, matches homepage city/category style */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {['profile', 'visited', 'saved', 'collections', 'trips', 'achievements', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`transition-all ${
                  activeTab === tab
                    ? "font-medium text-black dark:text-white"
                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-12 fade-in">
            {/* Curation Completion - Prominent gamification stat */}
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-4xl font-light mb-1">{stats.curationCompletionPercentage}%</div>
                  <div className="text-xs text-gray-500">of curation explored</div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  {stats.visitedCount} / {totalDestinations} places
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(stats.curationCompletionPercentage, 100)}%` }}
                />
              </div>
              {stats.curationCompletionPercentage < 100 && (
                <p className="text-xs text-gray-400 mt-3">
                  {stats.curationCompletionPercentage < 10
                    ? "Just getting started! Keep exploring."
                    : stats.curationCompletionPercentage < 25
                    ? "Great start! Many more places to discover."
                    : stats.curationCompletionPercentage < 50
                    ? "Halfway there! You're doing amazing."
                    : stats.curationCompletionPercentage < 75
                    ? "Impressive! You're a seasoned explorer."
                    : "Almost there! You've explored most of our curation."}
                </p>
              )}
              {stats.curationCompletionPercentage === 100 && (
                <p className="text-xs text-gray-400 mt-3">
                  🎉 Incredible! You've visited every place in our curation!
                </p>
              )}
            </div>

            {/* Stats Grid - Minimal, like homepage cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.visitedCount}</div>
                <div className="text-xs text-gray-500">Visited</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.savedCount}</div>
                <div className="text-xs text-gray-500">Saved</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.uniqueCities.size}</div>
                <div className="text-xs text-gray-500">Cities</div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <div className="text-2xl font-light mb-1">{stats.uniqueCountries.size}</div>
                <div className="text-xs text-gray-500">Countries</div>
              </div>
            </div>

            {/* World Map */}
            {(stats.uniqueCountries.size > 0 || stats.visitedDestinationsWithCoords.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">Travel Map</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stats.uniqueCountries.size > 0 && `${stats.uniqueCountries.size} ${stats.uniqueCountries.size === 1 ? 'country' : 'countries'}`}
                    {stats.uniqueCountries.size > 0 && stats.uniqueCities.size > 0 && ' • '}
                    {stats.uniqueCities.size > 0 && `${stats.uniqueCities.size} ${stats.uniqueCities.size === 1 ? 'city' : 'cities'}`}
                  </p>
                </div>
                <WorldMapVisualization 
                  visitedCountries={stats.uniqueCountries}
                  visitedDestinations={stats.visitedDestinationsWithCoords}
                />
              </div>
            )}

            {/* Recent Visits */}
            {visitedPlaces.length > 0 && (
              <div>
                <h2 className="text-xs font-medium mb-4 text-gray-500 dark:text-gray-400">Recent Visits</h2>
                <div className="space-y-2">
                  {visitedPlaces.slice(0, 5).map((place) => (
                    <button
                      key={place.destination_slug}
                      onClick={() => router.push(`/destination/${place.destination_slug}`)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-left"
                    >
                      {place.destination.image && (
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <Image
                            src={place.destination.image}
                            alt={place.destination.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{place.destination.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {capitalizeCity(place.destination.city)} • {place.destination.category}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(place.visited_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visited Tab */}
        {activeTab === 'visited' && (
          <div className="fade-in">
            <EnhancedVisitedTab
              visitedPlaces={visitedPlaces}
              onPlaceAdded={loadUserData}
            />
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <div className="fade-in">
            <EnhancedSavedTab savedPlaces={savedPlaces} />
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <div className="fade-in">
            {collections.length === 0 ? (
              <NoCollectionsEmptyState onCreateCollection={() => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
                  >
                    + New Collection
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => router.push(`/collection/${collection.id}`)}
                      className="text-left p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{collection.emoji || '📚'}</span>
                        <h3 className="font-medium text-sm flex-1">{collection.name}</h3>
                      </div>
                      {collection.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{collection.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{collection.destination_count || 0} places</span>
                        {collection.is_public && <span>• Public</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="fade-in">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditingTripId(null);
                  setShowTripDialog(true);
                }}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                New Trip
              </button>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
                <button
                  onClick={() => {
                    setEditingTripId(null);
                    setShowTripDialog(true);
                  }}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
                >
                  Create your first trip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/trips/${trip.id}`)}
                      className="text-left p-4 flex-1"
                    >
                      <h3 className="font-medium text-sm mb-2 line-clamp-2">{trip.title}</h3>
                      {trip.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{trip.description}</p>
                      )}
                      <div className="space-y-1 text-xs text-gray-400">
                        {trip.destination && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{trip.destination}</span>
                          </div>
                        )}
                        {(trip.start_date || trip.end_date) && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                              {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            </span>
                          </div>
                        )}
                        {trip.status && (
                          <div>
                            <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                              {trip.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 p-4 pt-0 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/trips/${trip.id}`);
                        }}
                        className="flex-1 text-xs font-medium py-2 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTripId(trip.id);
                          setShowTripDialog(true);
                        }}
                        className="p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={`Edit ${trip.title}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${trip.title}"?`)) {
                            try {
                              const { error } = await supabase
                                .from('trips')
                                .delete()
                                .eq('id', trip.id);
                              if (error) throw error;
                              await loadUserData();
                            } catch (error) {
                              console.error('Error deleting trip:', error);
                              alert('Failed to delete trip');
                            }
                          }
                        }}
                        className="p-2 rounded-xl text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label={`Delete ${trip.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="fade-in">
            <AchievementsDisplay
              visitedPlaces={visitedPlaces}
              savedPlaces={savedPlaces}
              uniqueCities={stats.uniqueCities}
              uniqueCountries={stats.uniqueCountries}
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && user && (
          <div className="fade-in space-y-10">
            <ProfileEditor
              userId={user.id}
              onSaveComplete={() => {
                // Optionally reload user data or show success message
                alert('Profile updated successfully!');
              }}
            />
            <AccountPrivacyManager />
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light">Create Collection</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:opacity-60 transition-opacity"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2">Description</label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="collection-public"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="collection-public" className="text-xs">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium"
                  disabled={creatingCollection}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || creatingCollection}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {creatingCollection ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Planner Modal */}
      <TripPlanner
        isOpen={showTripDialog}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowTripDialog(false);
          setEditingTripId(null);
          loadUserData();
        }}
      />
    </main>
  );
}
