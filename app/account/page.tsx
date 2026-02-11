'use client';

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cityCountryMap } from "@/data/cityCountryMap";
import { EnhancedVisitedTab } from "@/components/EnhancedVisitedTab";
import { EnhancedSavedTab } from "@/components/EnhancedSavedTab";
import { PageLoader } from "@/components/LoadingStates";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AccountPrivacyManager } from "@/components/AccountPrivacyManager";
import { SecuritySettings } from "@/components/SecuritySettings";
import { PreferencesTab } from "@/features/account/components/PreferencesTab";
import { MCPIntegration } from "@/features/account/components/MCPIntegration";
import { openCookieSettings } from "@/components/CookieConsent";
import { NoCollectionsEmptyState } from "@/components/EmptyStates";
import { EnhancedProfileTab } from "@/components/account/EnhancedProfileTab";
import { EnhancedAchievementsTab } from "@/components/account/EnhancedAchievementsTab";
import { EnhancedTripsTab } from "@/components/account/EnhancedTripsTab";
import type { Collection, SavedPlace, VisitedPlace } from "@/types/common";
import type { Trip } from "@/types/trip";
import type { User } from "@supabase/supabase-js";
import { toast } from "@/lib/toast";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Get initial tab from URL query param - use useEffect to avoid SSR issues
  const [activeTab, setActiveTab] = useState<'profile' | 'visited' | 'saved' | 'collections' | 'achievements' | 'settings' | 'trips'>('profile');
  const [settingsSubtab, setSettingsSubtab] = useState<'profile' | 'preferences' | 'integrations' | 'security' | 'privacy'>('profile');

  // Update tab from URL params after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const validTabs = ['profile', 'visited', 'saved', 'collections', 'achievements', 'settings', 'trips'] as const;
      if (tab && validTabs.includes(tab as typeof validTabs[number])) {
        setActiveTab(tab as typeof activeTab);
      }
    }
  }, []);

  // Collection creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(true);
  const [creatingCollection, setCreatingCollection] = useState(false);


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
      setAuthChecked(true);
    }

    checkAuth();
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
          .from('lists')
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
      interface SavedPlaceRow {
        destination_slug: string;
      }
      interface VisitedPlaceRow {
        destination_slug: string;
        visited_at?: string;
        rating?: number;
        notes?: string;
      }
      
      if (savedResult.data) {
        (savedResult.data as SavedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }
      if (visitedResult.data) {
        (visitedResult.data as VisitedPlaceRow[]).forEach((item) => allSlugs.add(item.destination_slug));
      }

      // Fetch destinations with location data for map
      if (allSlugs.size > 0) {
        interface DestRow {
          slug: string;
          name: string;
          city: string;
          category: string;
          image?: string;
          latitude?: number | null;
          longitude?: number | null;
          country?: string;
        }
        
        const { data: destData } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, latitude, longitude, country')
          .in('slug', Array.from(allSlugs));

        if (destData) {
          const typedDestData = destData as DestRow[];
          
          // Map saved places
          if (savedResult.data) {
            const typedSavedData = savedResult.data as SavedPlaceRow[];
            setSavedPlaces(typedSavedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? {
                id: 0, // placeholder
                user_id: user.id,
                destination_id: 0, // placeholder
                destination_slug: dest.slug,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  country: dest.country
                }
              } as SavedPlace : null;
            }).filter((item): item is SavedPlace => item !== null));
          }

          // Map visited places
          if (visitedResult.data) {
            const typedVisitedData = visitedResult.data as VisitedPlaceRow[];
            setVisitedPlaces(typedVisitedData.map((item) => {
              const dest = typedDestData.find((d) => d.slug === item.destination_slug);
              return dest ? {
                id: 0, // placeholder
                user_id: user.id,
                destination_id: 0, // placeholder
                destination_slug: dest.slug,
                visited_at: item.visited_at,
                rating: item.rating,
                notes: item.notes,
                created_at: '',
                destination: {
                  slug: dest.slug,
                  name: dest.name,
                  city: dest.city,
                  category: dest.category,
                  image: dest.image,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                  country: dest.country
                }
              } as VisitedPlace : null;
            }).filter((item): item is VisitedPlace => item !== null));
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
    } catch (error) {
      console.error('Error creating collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create collection. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCreatingCollection(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCities = new Set([
      ...savedPlaces.map(p => p.destination?.city).filter((city): city is string => typeof city === 'string'),
      ...visitedPlaces.filter(p => p.destination).map(p => p.destination!.city)
    ]);

    // Get countries from destination.country field first, fallback to cityCountryMap
    const countriesFromDestinations = new Set([
      ...savedPlaces.map(p => p.destination?.country).filter((country): country is string => typeof country === 'string' && country.trim().length > 0),
      ...visitedPlaces.filter(p => p.destination?.country).map(p => p.destination!.country!).filter((country): country is string => typeof country === 'string' && country.trim().length > 0)
    ]);

    const countriesFromCities = Array.from(uniqueCities)
      .map(city => {
        if (!city) return null;
        let country = cityCountryMap[city];
        if (country) return country;
        const cityLower = city.toLowerCase();
        country = cityCountryMap[cityLower];
        if (country) return country;
        const cityHyphenated = cityLower.replace(/\s+/g, '-');
        country = cityCountryMap[cityHyphenated];
        if (country) return country;
        const cityNoHyphens = cityLower.replace(/-/g, '');
        country = cityCountryMap[cityNoHyphens];
        return country || null;
      })
      .filter((country): country is string => country !== null && country !== undefined);

    const uniqueCountries = new Set([
      ...Array.from(countriesFromDestinations),
      ...countriesFromCities
    ]);

    const visitedDestinationsWithCoords = visitedPlaces
      .filter(p => p.destination)
      .map(p => ({
        city: p.destination!.city,
        latitude: p.destination!.latitude,
        longitude: p.destination!.longitude,
      }))
      .filter(d => d.latitude && d.longitude);

    return {
      uniqueCities,
      uniqueCountries,
      visitedCount: visitedPlaces.length,
      savedCount: savedPlaces.length,
      visitedDestinationsWithCoords
    };
  }, [savedPlaces, visitedPlaces]);

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
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="mb-12">
          <h1 className="text-2xl font-light">Account</h1>
        </div>
        <div className="max-w-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Sign in to save places, track your visits, and create collections.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm font-medium text-black dark:text-white hover:opacity-60 transition-opacity"
          >
            Sign in →
          </button>
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
            {(['profile', 'visited', 'saved', 'collections', 'trips', 'achievements', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
          <div className="fade-in">
            <EnhancedProfileTab
              userId={user.id}
              userEmail={user.email}
              visitedPlaces={visitedPlaces}
              savedPlaces={savedPlaces}
              stats={stats}
              onEditProfile={() => {
                setActiveTab('settings');
                setSettingsSubtab('profile');
              }}
            />
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
          <div className="fade-in max-w-2xl">
            {collections.length === 0 ? (
              <NoCollectionsEmptyState onCreateCollection={() => setShowCreateModal(true)} />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-6">
                  <p className="text-sm text-gray-500">{collections.length} {collections.length === 1 ? 'collection' : 'collections'}</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    + New
                  </button>
                </div>
                <div className="space-y-3">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => router.push(`/collection/${collection.id}`)}
                      className="block text-left text-sm hover:opacity-60 transition-opacity"
                    >
                      <span className="font-medium">{collection.name}</span>
                      <span className="text-gray-500"> · {collection.destination_count || 0} places</span>
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
            <EnhancedTripsTab
              trips={trips}
              onTripCreated={loadUserData}
              onEditTrip={(tripId) => {
                router.push(`/trips/${tripId}`);
              }}
              onNewTrip={() => {
                router.push('/trips/new');
              }}
            />
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="fade-in">
            <EnhancedAchievementsTab
              visitedPlaces={visitedPlaces}
              savedPlaces={savedPlaces}
              stats={stats}
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && user && (
          <div className="fade-in">
            {/* Settings Subtabs */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-8">
              {(['profile', 'preferences', 'integrations', 'security', 'privacy'] as const).map((subtab) => (
                <button
                  key={subtab}
                  onClick={() => setSettingsSubtab(subtab)}
                  className={`transition-all ${
                    settingsSubtab === subtab
                      ? "font-medium text-black dark:text-white"
                      : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                  }`}
                >
                  {subtab.charAt(0).toUpperCase() + subtab.slice(1)}
                </button>
              ))}
            </div>

            {/* Profile Subtab */}
            {settingsSubtab === 'profile' && (
              <div className="max-w-md">
                <ProfileEditor
                  userId={user.id}
                  onSaveComplete={() => {
                    toast.success('Profile updated');
                  }}
                />
              </div>
            )}

            {/* Preferences Subtab */}
            {settingsSubtab === 'preferences' && (
              <PreferencesTab userId={user.id} />
            )}

            {/* Integrations Subtab */}
            {settingsSubtab === 'integrations' && (
              <MCPIntegration />
            )}

            {/* Security Subtab */}
            {settingsSubtab === 'security' && (
              <div className="max-w-md">
                <SecuritySettings />
              </div>
            )}

            {/* Privacy Subtab */}
            {settingsSubtab === 'privacy' && (
              <div className="max-w-md">
                <AccountPrivacyManager />
                <div className="mt-8 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cookie preferences</span>
                  <button
                    onClick={openCookieSettings}
                    className="text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-950 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium mb-6">New Collection</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-3 py-2 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:outline-none focus:border-black dark:focus:border-white text-sm transition-colors"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Description</label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className="w-full px-3 py-2 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm transition-colors"
                  maxLength={200}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">Public collection</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                disabled={creatingCollection}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creatingCollection}
                className="text-xs font-medium text-black dark:text-white hover:opacity-60 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {creatingCollection ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
