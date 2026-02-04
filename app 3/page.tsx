'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Destination } from '@/types/destination';
import { 
  Search, MapPin, Clock, Map, Grid3x3, SlidersHorizontal, X, Star, LayoutGrid, Plus, Sparkles
} from 'lucide-react';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
// Lazy load drawer (only when opened)
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { 
    ssr: false,
    loading: () => null
  }
);
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { SequencePredictionsInline } from '@/components/SequencePredictionsInline';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackSearch,
  trackFilterChange,
  getSessionId,
} from '@/lib/tracking';
import GreetingHero from '@/src/features/search/GreetingHero';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { TrendingSection } from '@/components/TrendingSection';
import { TrendingSectionML } from '@/components/TrendingSectionML';
import { SearchFiltersComponent } from '@/src/features/search/SearchFilters';
import { MultiplexAd } from '@/components/GoogleAd';
import { DistanceBadge } from '@/components/DistanceBadge';
import { MarkdownRenderer } from '@/src/components/MarkdownRenderer';
import { SessionResume } from '@/components/SessionResume';
import { ContextCards } from '@/components/ContextCards';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { RefinementChips, type RefinementTag } from '@/components/RefinementChips';
import { DestinationBadges } from '@/components/DestinationBadges';
import { FollowUpSuggestions } from '@/components/FollowUpSuggestions';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { capitalizeCity } from '@/lib/utils';
import { isOpenNow } from '@/lib/utils/opening-hours';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { TripPlanner } from '@/components/TripPlanner';
import { getContextAwareLoadingMessage } from '@/src/lib/context/loading-message';
import { POIDrawer } from '@/components/POIDrawer';

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// Category icons using Untitled UI icons
function getCategoryIcon(category: string): React.ComponentType<{ className?: string; size?: number | string }> | null {
  return getCategoryIconComponent(category);
}

function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Use capitalizeCity from lib/utils.ts instead of duplicate function

function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getFirstArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined;
}

function pickString(...sources: Array<unknown | (() => unknown)>): string {
  for (const source of sources) {
    const candidate = typeof source === 'function' ? (source as () => unknown)() : source;
    const text = toTrimmedString(candidate);
    if (text) {
      return text;
    }
  }
  return '';
}

function normalizeDiscoveryEngineRecord(recordInput: unknown): Destination | null {
  if (!isRecord(recordInput)) {
    return null;
  }

  const record = recordInput as Record<string, unknown>;

  const name = pickString(record.name, record.title);
  const city = pickString(
    record.city,
    () => (isRecord(record.location) ? record.location.city : undefined),
    () => (isRecord(record.metadata) ? record.metadata.city : undefined),
    () => (isRecord(record.structData) ? record.structData.city : undefined),
    () => {
      const firstLocation = getFirstArrayItem(record.locations);
      return isRecord(firstLocation) ? firstLocation.city : firstLocation;
    }
  );
  const category = pickString(
    record.category,
    record.category_name,
    () => (isRecord(record.metadata) ? record.metadata.category : undefined),
    () => (isRecord(record.structData) ? record.structData.category : undefined),
    () => {
      const firstCategory = getFirstArrayItem(record.categories);
      return isRecord(firstCategory) ? firstCategory.category : firstCategory;
    }
  );

  const slugSource = pickString(record.slug, record.id, name);
  const slug = slugify(slugSource || name);

  if (!slug || !name || !city || !category) {
    return null;
  }

  const description = pickString(record.description, record.summary, record.snippet) || undefined;
  const content = pickString(record.content, record.longDescription, record.body) || undefined;

  const imageCandidate = pickString(
    record.image,
    record.imageUrl,
    record.image_url,
    record.primaryImage,
    record.primary_image,
    record.mainImage,
    record.main_image,
    () => {
      const firstImage = getFirstArrayItem(record.images);
      if (isRecord(firstImage)) {
        return firstImage.url;
      }
      return firstImage;
    },
    () => {
      const media = record.media;
      if (isRecord(media)) {
        const firstMediaImage = getFirstArrayItem(media.images);
        if (isRecord(firstMediaImage)) {
          return firstMediaImage.url;
        }
        return firstMediaImage;
      }
      return undefined;
    }
  );

  let tags: string[] | undefined;
  const rawTags = record.tags;
  if (Array.isArray(rawTags)) {
    tags = rawTags
      .map((tag) => toTrimmedString(tag))
      .filter((tag): tag is string => Boolean(tag));
  } else {
    const tagText = toTrimmedString(rawTags);
    if (tagText) {
      tags = tagText.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  }

  const ratingValue =
    toNumberOrNull(record.rating) ??
    toNumberOrNull(record.ratingValue) ??
    toNumberOrNull(record.averageRating) ??
    toNumberOrNull(record.average_rating) ??
    toNumberOrNull(record.rating_score);

  const priceLevel =
    toNumberOrNull(record.priceLevel) ??
    toNumberOrNull(record.price_level) ??
    toNumberOrNull(record.priceLevelValue);

  const michelin =
    toNumberOrNull(record.michelin_stars) ??
    toNumberOrNull(record.michelinStars) ??
    toNumberOrNull(record.michelin) ??
    undefined;

  const badges = record.badges;
  let crown: boolean | undefined;
  if (typeof record.crown === 'boolean') {
    crown = record.crown;
  } else if (Array.isArray(badges)) {
    crown = badges.some((badge) => toTrimmedString(badge).toLowerCase() === 'crown');
  }

  return {
    slug,
    name,
    city,
    category,
    description,
    content,
    image: imageCandidate || undefined,
    michelin_stars: michelin ?? undefined,
    crown,
    tags,
    rating: ratingValue,
    price_level: priceLevel,
  };
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { trackAction, predictions } = useSequenceTracker();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPOIDrawer, setShowPOIDrawer] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  
  // AI is enabled - backend handles fallback gracefully if OpenAI unavailable
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'recent'>('default');
  // Removed loading state - page renders immediately, data loads in background
  const [searching, setSearching] = useState(false);
  const [discoveryEngineLoading, setDiscoveryEngineLoading] = useState(false);
  const [searchTier, setSearchTier] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showTripSidebar, setShowTripSidebar] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Calculate items per page based on 4 full rows × current grid columns
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<{
    searchQuery?: string;
    city?: string;
    category?: string;
    michelin?: boolean;
    crown?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    openNow?: boolean;
    nearMe?: boolean;
    nearMeRadius?: number;
  }>({});
  // Near Me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);
  // Featured cities to always show in filter
  const FEATURED_CITIES = ['taipei', 'tokyo', 'new-york', 'london'];

  // AI-powered chat using the chat API endpoint - only website content
  const [chatResponse, setChatResponse] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string, destinations?: Destination[]}>>([]);
  const [searchIntent, setSearchIntent] = useState<ExtractedIntent | null>(null); // Store enhanced intent data
  const [seasonalContext, setSeasonalContext] = useState<any>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<Array<{ text: string; icon?: 'location' | 'time' | 'price' | 'rating' | 'default'; type?: 'refine' | 'expand' | 'related' }>>([]);

  // Session and context state
  const [lastSession, setLastSession] = useState<any>(null);
  const [userContext, setUserContext] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSessionResume, setShowSessionResume] = useState(false);
  // Phase 2 & 3: Enriched greeting context
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<any>(null);

  // Track submitted query for chat display
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [followUpInput, setFollowUpInput] = useState<string>('');

  // Track visual chat messages for display
  const [chatMessages, setChatMessages] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    contextPrompt?: string;
  }>>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fallbackDestinationsRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapPromiseRef = useRef<Promise<Destination[]> | null>(null);
  
  // Loading text variants
  const loadingTextVariants = [
    'Finding the perfect spots...',
    'Searching for amazing places...',
    'Discovering hidden gems...',
    'Curating the best destinations...',
    'Exploring top recommendations...',
    'Finding your next adventure...',
    'Locating must-visit places...',
    'Selecting the finest spots...',
  ];
  const [currentLoadingText, setCurrentLoadingText] = useState(loadingTextVariants[0]);
  const [inferredTags, setInferredTags] = useState<{
    neighborhoods?: string[];
    styleTags?: string[];
    priceLevel?: string;
    modifiers?: string[];
  } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const extractFilterOptions = (rows: Array<{ city?: string | null; category?: string | null }>) => {
    const citySet = new Set<string>();
    const categorySet = new Set<string>();

    rows.forEach(row => {
      const city = (row.city ?? '').toString().trim();
      const category = (row.category ?? '').toString().trim();

      if (city) {
        citySet.add(city);
      }
      if (category) {
        categorySet.add(category);
      }
    });

    return {
      cities: Array.from(citySet).sort(),
      categories: Array.from(categorySet).sort(),
    };
  };

  const loadFallbackDestinations = async () => {
    if (fallbackDestinationsRef.current) {
      return fallbackDestinationsRef.current;
    }

    try {
      const response = await fetch('/destinations.json');
      if (!response.ok) {
        throw new Error(`Failed to load fallback destinations: ${response.status}`);
      }

      const raw = await response.json();
      const normalized: Destination[] = (Array.isArray(raw) ? raw : [])
        .map((item: any) => {
          const slug = slugify(item.slug || item.name || '');

          const tags = Array.isArray(item.tags)
            ? item.tags
            : typeof item.cardTags === 'string'
              ? item.cardTags
                  .split(',')
                  .map((tag: string) => tag.trim())
                  .filter(Boolean)
              : undefined;

          return {
            slug,
            name: (item.name || slug || 'Unknown destination').toString(),
            city: (item.city || '').toString().trim(),
            category: (item.category || '').toString().trim(),
            description: item.description || item.subline || undefined,
            content: item.content || undefined,
            image: item.image || item.mainImage || undefined,
            michelin_stars: item.michelin_stars ?? item.michelinStars ?? undefined,
            crown: item.crown ?? undefined,
            tags: tags && tags.length > 0 ? tags : undefined,
          } as Destination;
        })
        .filter((destination: Destination) => Boolean(destination.slug && destination.city && destination.category));

      fallbackDestinationsRef.current = normalized;
      return normalized;
    } catch (error) {
      console.warn('[Fallback] Unable to load static destinations:', error);
      fallbackDestinationsRef.current = [];
      return [];
    }
  };

  const applyFallbackData = async (options: { updateDestinations?: boolean; ensureFilters?: boolean } = {}) => {
    const { updateDestinations = false, ensureFilters = true } = options;
    const fallback = await loadFallbackDestinations();

    if (!fallback.length) {
      return;
    }

    if (updateDestinations) {
      setDestinations(fallback);
    }

    if (ensureFilters) {
      const { cities: fallbackCities, categories: fallbackCategories } = extractFilterOptions(fallback);
      if (fallbackCities.length) {
        setCities(prev => (fallbackCities.length > prev.length ? fallbackCities : prev));
      }
      if (fallbackCategories.length) {
        setCategories(prev => (fallbackCategories.length > prev.length ? fallbackCategories : prev));
      }
    }
  };

  // Helper function to apply Discovery Engine data (reduces code duplication)
  const applyDiscoveryEngineData = async (
    discoveryBaseline: Destination[],
    options: {
      updateDestinations?: boolean;
      updateFilters?: boolean;
      compareWithExisting?: { cities: string[]; categories: string[] };
    } = {}
  ) => {
    const {
      updateDestinations = false,
      updateFilters = true,
      compareWithExisting,
    } = options;

    if (!discoveryBaseline.length) {
      return false;
    }

    if (updateFilters) {
      const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
      
      if (compareWithExisting) {
        // Only update if Discovery Engine has more options
        if (discoveryCities.length > compareWithExisting.cities.length) {
          setCities(discoveryCities);
        }
        if (discoveryCategories.length > compareWithExisting.categories.length) {
          setCategories(discoveryCategories);
        }
      } else {
        // Always update if no comparison
        setCities(discoveryCities);
        setCategories(discoveryCategories);
      }
    }

    if (updateDestinations) {
      setDestinations(discoveryBaseline);
      const filtered = filterDestinationsWithData(
        discoveryBaseline,
        '', {}, '', '', user, visitedSlugs
      );
      setFilteredDestinations(filtered);
    }

    return true;
  };

  const fetchDiscoveryBootstrap = async (): Promise<Destination[]> => {
    if (discoveryBootstrapRef.current !== null) {
      console.log('[Discovery Engine] Using cached bootstrap data');
      return discoveryBootstrapRef.current;
    }

    if (discoveryBootstrapPromiseRef.current) {
      console.log('[Discovery Engine] Waiting for existing bootstrap request');
      return discoveryBootstrapPromiseRef.current;
    }

    const promise = (async () => {
      const startTime = Date.now();
      try {
        console.log('[Discovery Engine] Starting bootstrap request...');
        const response = await fetch('/api/search/discovery', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'top destinations',
            pageSize: 200,
            userId: user?.id,
            filters: {},
          }),
        });

        const elapsed = Date.now() - startTime;
        console.log(`[Discovery Engine] Response received (${elapsed}ms):`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          if (response.status === 503) {
            // 503 is expected when Discovery Engine is not configured - use debug log instead of warn
            console.debug('[Discovery Engine] Service unavailable (503) - Discovery Engine not configured, using Supabase fallback');
          } else {
            let errorDetails: Record<string, unknown> | null = null;
            try {
              errorDetails = (await response.json()) as Record<string, unknown>;
            } catch {
              // Ignore parse errors and fall back to status text
            }
            const detailMessage =
              (typeof errorDetails?.error === 'string' && errorDetails.error) ||
              (typeof errorDetails?.details === 'string' && errorDetails.details) ||
              response.statusText;
            console.warn('[Discovery Engine] Bootstrap request failed:', {
              status: response.status,
              message: detailMessage,
            });
            console.debug('[Discovery Engine] Falling back to Supabase only');
          }

          discoveryBootstrapRef.current = null;
          return [];
        }

        const payload: { results?: unknown; source?: string; fallback?: boolean } = await response
          .json()
          .catch(() => ({ results: [] as unknown[] }));

        const normalized = Array.isArray(payload.results)
          ? payload.results
              .map(normalizeDiscoveryEngineRecord)
              .filter((item): item is Destination => Boolean(item))
          : [];

        discoveryBootstrapRef.current = normalized;

        if (normalized.length > 0) {
          console.log(`[Discovery Engine] Successfully bootstrapped ${normalized.length} destinations`, {
            source: payload.source || 'unknown',
            fallback: payload.fallback || false,
            elapsed: `${Date.now() - startTime}ms`,
          });
        } else {
          console.warn('[Discovery Engine] Bootstrap returned no destinations', {
            source: payload.source || 'unknown',
            fallback: payload.fallback || false,
          });
        }

        return normalized;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Only warn if it's not a 503/configuration error
        if (!message.includes('503') && !message.includes('not configured')) {
          console.warn('[Discovery Engine] Bootstrap failed:', message, {
            elapsed: `${Date.now() - startTime}ms`,
          });
        } else {
          console.debug('[Discovery Engine] Bootstrap failed (expected):', message);
        }
        console.debug('[Discovery Engine] Falling back to Supabase only');
        discoveryBootstrapRef.current = null;
        return [];
      } finally {
        discoveryBootstrapPromiseRef.current = null;
      }
    })();

    discoveryBootstrapPromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    // Initialize session tracking
    initializeSession();

    // Track homepage view
    trackPageView({ pageType: 'home' });

    // Fire-and-forget: Load data in background, don't block render
    // Page renders immediately, data loads asynchronously
    // Prioritize fetchDestinations first (it also sets cities), then fetchFilterData for enhancement
    void fetchDestinations();
    // fetchFilterData will enhance cities if it has more, but won't block initial display
    void fetchFilterData();
  }, []);

  useEffect(() => {
    if (user) {
      // Check if user is admin
      const role = (user.app_metadata as Record<string, any> | undefined)?.role;
      setIsAdmin(role === 'admin');
      
      // Priority: Fetch visited places FIRST (needed for filtering)
      // Then fetch profile and session in parallel
      fetchVisitedPlaces().then(() => {
        // After visited places are loaded, re-filter destinations if they're already loaded
        if (destinations.length > 0) {
          filterDestinations();
        }
      });
      fetchLastSession();
      fetchUserProfile();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Phase 2 & 3: Fetch enriched greeting context when user profile is loaded
  useEffect(() => {
    if (user && userProfile) {
      fetchEnrichedGreetingContext();
    }
  }, [user, userProfile]);

  // Fetch last conversation session
  async function fetchLastSession() {
    if (!user) return;

    try {
      const response = await fetch(`/api/conversation/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session_id && data.messages && data.messages.length > 0) {
          setLastSession({
            id: data.session_id,
            last_activity: data.last_activity || new Date().toISOString(),
            context_summary: data.context,
            message_count: data.messages.length,
          });
          // Show session resume if session is less than 24 hours old
          const lastActivity = new Date(data.last_activity || Date.now());
          const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            setShowSessionResume(true);
          }
        }
      }
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching last session:', error);
      }
    }
  }

  // Fetch user profile for context
  async function fetchUserProfile() {
    if (!user) return;

    try {
      const response = await fetch('/api/homepage/profile', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setUserProfile(null);
        setUserContext(null);
        return;
      }

      if (!response.ok) {
        console.warn('Error fetching user profile:', await response.text());
        return;
      }

      const payload = await response.json();
      const data = payload.profile;

      if (!data) {
        setUserProfile(null);
        setUserContext(null);
        return;
      }

      // Store full profile for greeting context
      setUserProfile(data);
      // Also store simplified version for other components
      const profileData = data as any;
      setUserContext({
        favoriteCities: profileData.favorite_cities || [],
        favoriteCategories: profileData.favorite_categories || [],
        travelStyle: profileData.travel_style,
      });
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching user profile:', error);
      }
    }
  }

  // Phase 2 & 3: Fetch enriched greeting context (journey, achievements, weather, trending)
  async function fetchEnrichedGreetingContext() {
    if (!user || !userProfile) return;

    try {
      const favoriteCity = userProfile.favorite_cities?.[0];
      const params = new URLSearchParams({
        userId: user.id,
      });
      if (favoriteCity) {
        params.append('favoriteCity', favoriteCity);
      }

      const response = await fetch(`/api/greeting/context?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.context) {
          setEnrichedGreetingContext(data.context);
        }
      }
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user && userProfile) {
        console.warn('Error fetching enriched greeting context:', error);
      }
    }
  }

  function handleResumeSession(sessionId: string) {
    // Load the session
    setShowSessionResume(false);
    // The session is already loaded from fetchLastSession
    // Just scroll to the chat area or show a confirmation
  }

  // CHAT MODE with auto-trigger: Auto-trigger on typing (debounced) + explicit Enter submit
  // Works like chat but with convenience of auto-trigger
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const timer = setTimeout(() => {
        performAISearch(searchTerm);
      }, 500); // 500ms debounce for auto-trigger
      return () => clearTimeout(timer);
    } else {
      // Clear everything when search is empty
      setFilteredDestinations([]);
      setChatResponse('');
      setConversationHistory([]);
      setSearching(false);
      setSubmittedQuery('');
      setChatMessages([]);
      // Show all destinations when no search (with filters if set)
      filterDestinations();
      setCurrentPage(1);
    }
  }, [searchTerm]); // ONLY depend on searchTerm

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Separate useEffect for filters (only when NO search term)
  // Fetch destinations lazily when filters are applied
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Only fetch destinations if we haven't already
      if (destinations.length === 0) {
        fetchDestinations();
      } else {
        // If destinations are already loaded, just re-filter (don't re-fetch)
        // This prevents unnecessary re-fetching when visitedSlugs changes after login
        // Note: filterDestinationsWithData is defined later, but it's a useCallback so it's stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
      filterDestinations();
      }
    }
    // Don't reset displayed count here - let the search effect handle it
  }, [selectedCity, selectedCategory, advancedFilters, visitedSlugs, destinations, sortBy]); // Filters only apply when no search

  // Note: Removed circular sync effect - SearchFiltersComponent now manages advancedFilters directly
  // and updates selectedCity/selectedCategory when needed, avoiding duplicate filter initialization

  // Fetch filter data (cities and categories) first for faster initial display
  // OPTIMIZED: Call Discovery Engine once at start, reuse result throughout
  const fetchFilterData = async () => {
    // OPTIMIZATION: Call Discovery Engine once at the start (cached by ref)
    const discoveryBaselinePromise = fetchDiscoveryBootstrap();
    
    try {
      console.log('[Filter Data] Starting fetch...');
      
      let filterRows: any[] | null = null;
      let fetchError: any = null;
      const controller = typeof window !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 30000) : null;
      try {
        const response = await fetch('/api/homepage/filters', {
          signal: controller?.signal,
        });
        if (!response.ok) {
          fetchError = new Error(await response.text());
        } else {
          const payload = await response.json();
          filterRows = payload.rows || [];
        }
      } catch (networkError: any) {
        console.warn('[Filter Data] Network error:', networkError?.message || networkError);
        fetchError = networkError;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      if (fetchError || !filterRows) {
        if (fetchError && !isIgnorableSupabaseError(fetchError)) {
          if (!fetchError.message?.includes('Network') && !fetchError.message?.includes('timeout')) {
            console.warn('[Filter Data] Error:', fetchError.message || fetchError);
          }
        }

        const discoveryBaseline = await discoveryBaselinePromise;
        if (discoveryBaseline.length) {
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          React.startTransition(() => {
            setCities(discoveryCities);
            setCategories(discoveryCategories);
          });
          if (destinations.length === 0) {
            setDestinations(discoveryBaseline);
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            setFilteredDestinations(filtered);
          }
        } else {
          await applyFallbackData({ updateDestinations: destinations.length === 0 });
        }
        return;
      }

      const { cities: uniqueCities, categories: uniqueCategories } = extractFilterOptions(filterRows as any[]);

      // OPTIMIZATION: Batch state updates
      React.startTransition(() => {
        setCities(uniqueCities);
        setCategories(uniqueCategories);
      });

      // OPTIMIZATION: Reuse the already-started Discovery Engine call
      const discoveryBaseline = await discoveryBaselinePromise;
      if (discoveryBaseline.length) {
        const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
        // OPTIMIZATION: Batch state updates - only update if Discovery Engine has more
        const updates: { cities?: string[]; categories?: string[] } = {};
        if (discoveryCities.length > uniqueCities.length) {
          updates.cities = discoveryCities;
        }
        if (discoveryCategories.length > uniqueCategories.length) {
          updates.categories = discoveryCategories;
        }
        if (Object.keys(updates).length > 0) {
          React.startTransition(() => {
            if (updates.cities) setCities(updates.cities);
            if (updates.categories) setCategories(updates.categories);
          });
        }
        if (destinations.length === 0) {
          setDestinations(discoveryBaseline);
          const filtered = filterDestinationsWithData(discoveryBaseline);
          setFilteredDestinations(filtered);
        }
      }

      console.log('[Filter Data] State updated:', {
        cities: uniqueCities.length,
        categories: uniqueCategories.length,
        sampleCities: uniqueCities.slice(0, 5)
      });
    } catch (error: any) {
      // OPTIMIZATION: Use helper function for error checking
      if (!isIgnorableSupabaseError(error)) {
        console.warn('[Filter Data] Exception:', error?.message || error);
      }

      // OPTIMIZATION: Reuse Discovery Engine call (already started)
      try {
        const discoveryBaseline = await discoveryBaselinePromise;
        if (discoveryBaseline.length) {
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          // OPTIMIZATION: Batch state updates
          React.startTransition(() => {
            setCities(discoveryCities);
            setCategories(discoveryCategories);
          });
          if (destinations.length === 0) {
            setDestinations(discoveryBaseline);
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              '', {}, '', '', user, visitedSlugs
            );
            setFilteredDestinations(filtered);
          }
        } else {
          await applyFallbackData({ updateDestinations: destinations.length === 0 });
        }
      } catch (fallbackError) {
        console.warn('[Filter Data] Fallback also failed:', fallbackError);
        // OPTIMIZATION: Batch state updates
        React.startTransition(() => {
          setCities([]);
      setCategories([]);
        });
      }
    }
  };

  const filterDestinationsWithData = useCallback((
    dataToFilter: Destination[],
    currentSearchTerm: string = searchTerm,
    currentAdvancedFilters: typeof advancedFilters = advancedFilters,
    currentSelectedCity: string = selectedCity,
    currentSelectedCategory: string = selectedCategory,
    currentUser: typeof user = user,
    currentVisitedSlugs: Set<string> = visitedSlugs,
    currentSortBy: 'default' | 'recent' = sortBy
  ) => {
    let filtered = dataToFilter;

    // Apply filters only when there's NO search term (AI chat handles all search)
    if (!currentSearchTerm) {
      // City filter (from advancedFilters or selectedCity)
      const cityFilter = currentAdvancedFilters.city || currentSelectedCity;
      if (cityFilter) {
        filtered = filtered.filter(d => d.city === cityFilter);
      }

      // Category filter (from advancedFilters or selectedCategory) - enhanced with tags
      const categoryFilter = currentAdvancedFilters.category || currentSelectedCategory;
      if (categoryFilter) {
        filtered = filtered.filter(d => {
          const categoryMatch = d.category && d.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim();
          
          // If category matches, include it
          if (categoryMatch) return true;
          
          // Also check tags for category-related matches
          const tags = d.tags || [];
          const categoryLower = categoryFilter.toLowerCase().trim();
          
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

      // Michelin filter
      if (currentAdvancedFilters.michelin) {
        filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
      }

      // Crown filter
      if (currentAdvancedFilters.crown) {
        filtered = filtered.filter(d => d.crown === true);
      }

      // Price filter
      if (currentAdvancedFilters.minPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level >= currentAdvancedFilters.minPrice!
        );
      }
      if (currentAdvancedFilters.maxPrice !== undefined) {
        filtered = filtered.filter(d => 
          d.price_level != null && d.price_level <= currentAdvancedFilters.maxPrice!
        );
      }

      // Rating filter
      if (currentAdvancedFilters.minRating !== undefined) {
        filtered = filtered.filter(d => 
          d.rating != null && d.rating >= currentAdvancedFilters.minRating!
        );
      }

      // Open Now filter - uses timezone_id, utc_offset, or city mapping
      if (currentAdvancedFilters.openNow) {
        filtered = filtered.filter(d => {
          // Try opening_hours_json first (from database), then opening_hours (normalized)
          const hours = (d as any).opening_hours_json || d.opening_hours;
          if (!hours) return false;
          
          return isOpenNow(
            hours,
            d.city,
            (d as any).timezone_id || undefined,
            (d as any).utc_offset || undefined
          );
        });
      }

      // Filter popup search query - only filters grid locally, doesn't trigger top search
      if (currentAdvancedFilters.searchQuery && currentAdvancedFilters.searchQuery.trim()) {
        const query = currentAdvancedFilters.searchQuery.toLowerCase();
        filtered = filtered.filter(d => 
          d.name?.toLowerCase().includes(query) ||
          d.city?.toLowerCase().includes(query) ||
          d.category?.toLowerCase().includes(query) ||
          d.neighborhood?.toLowerCase().includes(query) ||
          d.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
    }
    // When searchTerm exists, AI chat handles all filtering - don't apply text search here

    // Apply sorting
    if (currentSortBy === 'recent') {
      // Sort by created_at descending (newest first)
      filtered = filtered.sort((a, b) => {
        const aDate = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
        const bDate = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
        return bDate - aDate; // Descending (newest first)
      });
    } else {
      // Pinterest-style recommendation sorting
      // Only apply smart sorting when no search term (natural discovery)
      if (!currentSearchTerm) {
        filtered = filtered
          .map((dest, index) => ({
            ...dest,
            _score: getRecommendationScore(dest, index)
          }))
          .sort((a, b) => b._score - a._score);
      }
    }

    // When user is signed in: separate visited & unvisited, move visited to bottom
    // Only apply this when not sorting by recent (recent sort takes priority)
    if (currentSortBy !== 'recent' && currentUser && currentVisitedSlugs.size > 0) {
      const unvisited = filtered.filter(d => !currentVisitedSlugs.has(d.slug));
      const visited = filtered.filter(d => currentVisitedSlugs.has(d.slug));
      filtered = [...unvisited, ...visited];
    }

    return filtered;
  }, [searchTerm, advancedFilters, selectedCity, selectedCategory, user, visitedSlugs, sortBy]);
  const fetchDestinations = useCallback(async () => {
    try {
      let destinationsData: Destination[] | null = null;
      let fetchError: any = null;
      const controller = typeof window !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 30000) : null;
      try {
        // Add cache-busting query parameter to ensure fresh data after POI creation
        const response = await fetch(`/api/homepage/destinations?t=${Date.now()}`, {
          signal: controller?.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          fetchError = new Error(await response.text());
        } else {
          const payload = await response.json();
          destinationsData = payload.destinations || [];
        }
      } catch (networkError: any) {
        console.warn('[Destinations] Network error:', networkError?.message || networkError);
        fetchError = networkError;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      if (fetchError || !destinationsData || !Array.isArray(destinationsData) || destinationsData.length === 0) {
        if (fetchError && !isIgnorableSupabaseError(fetchError)) {
          if (!fetchError.message?.includes('Network') && !fetchError.message?.includes('timeout')) {
            console.warn('Error fetching destinations:', fetchError.message || fetchError);
          }
        }

        const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
        if (discoveryBaseline.length) {
          setDestinations(discoveryBaseline);
          // Don't filter destinations if there's an active AI chat search (submittedQuery)
          // AI chat handles its own filtering via performAISearch
          if (!submittedQuery) {
            const filtered = filterDestinationsWithData(
              discoveryBaseline,
              searchTerm,
              advancedFilters,
              selectedCity,
              selectedCategory,
              user,
              visitedSlugs,
              sortBy
            );
            setFilteredDestinations(filtered);
          }
          const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
          React.startTransition(() => {
            if (discoveryCities.length) setCities(discoveryCities);
            if (discoveryCategories.length) setCategories(discoveryCategories);
          });
        } else {
          await applyFallbackData({ updateDestinations: true });
        }
        return;
      }

      setDestinations(destinationsData as Destination[]);

      const { cities: uniqueCities, categories: uniqueCategories } = extractFilterOptions(destinationsData as any[]);
      if (uniqueCities.length) {
        setCities(uniqueCities);
      }
      if (uniqueCategories.length) {
        setCategories(uniqueCategories);
      }

      // Don't filter destinations if there's an active AI chat search (submittedQuery)
      // AI chat handles its own filtering via performAISearch
      if (!submittedQuery) {
        const filtered = filterDestinationsWithData(
          destinationsData as Destination[],
          searchTerm,
          advancedFilters,
          selectedCity,
          selectedCategory,
          user,
          visitedSlugs,
          sortBy
        );
        setFilteredDestinations(filtered);
      }

      setDiscoveryEngineLoading(true);
      fetchDiscoveryBootstrap()
        .then((discoveryBaseline) => {
          if (discoveryBaseline.length > 0) {
            const merged = [...(destinationsData as Destination[]), ...discoveryBaseline];
            const uniqueMerged = merged.filter((dest, index, self) =>
              index === self.findIndex(d => d.slug === dest.slug)
            );

            if (uniqueMerged.length > destinationsData!.length) {
              setDestinations(uniqueMerged);
              // Don't filter destinations if there's an active AI chat search (submittedQuery)
              // AI chat handles its own filtering via performAISearch
              if (!submittedQuery) {
                const filteredMerged = filterDestinationsWithData(
                  uniqueMerged,
                  searchTerm,
                  advancedFilters,
                  selectedCity,
                  selectedCategory,
                  user,
                  visitedSlugs,
                  sortBy
                );
                setFilteredDestinations(filteredMerged);
              }

              const { cities: discoveryCities, categories: discoveryCategories } = extractFilterOptions(discoveryBaseline);
              const updates: { cities?: string[]; categories?: string[] } = {};
              if (discoveryCities.length > uniqueCities.length) {
                updates.cities = discoveryCities;
              }
              if (discoveryCategories.length > uniqueCategories.length) {
                updates.categories = discoveryCategories;
              }
              if (Object.keys(updates).length > 0) {
                React.startTransition(() => {
                  if (updates.cities) setCities(updates.cities);
                  if (updates.categories) setCategories(updates.categories);
                });
              }
            }
          }
        })
        .catch(() => {
          // Discovery Engine failed - that's fine, we already have initial data
        })
        .finally(() => {
          setDiscoveryEngineLoading(false);
        });
    } catch (error: any) {
      if (!isIgnorableSupabaseError(error)) {
        console.warn('Error fetching destinations:', error?.message || error);
      }

      const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
      if (!discoveryBaseline.length) {
        await applyFallbackData({ updateDestinations: true });
      }
    }
  }, [user, visitedSlugs, filterDestinationsWithData, searchTerm, advancedFilters, selectedCity, selectedCategory, sortBy, submittedQuery]);

  const fetchVisitedPlaces = async (): Promise<void> => {
    if (!user) return;

    try {
      const response = await fetch('/api/homepage/visited', {
        credentials: 'include',
      });

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        console.warn('Error fetching visited places:', await response.text());
        return;
      }

      const payload = await response.json();
      const slugs = new Set((payload.slugs as string[] | undefined) || []);
      setVisitedSlugs(slugs);
    } catch (error) {
      // Expected error if user is not logged in - suppress
      if (user) {
        console.warn('Error fetching visited places:', error);
      }
    }
  };

  // AI Chat-only search - EXACTLY like chat component
  // Accept ANY query (like chat component), API will validate
  const performAISearch = useCallback(async (query: string) => {
    // Track search action for sequence prediction
    if (query.trim()) {
      trackAction({
        type: 'search',
        query: query.trim(),
      });
    }
    setSubmittedQuery(query); // Store the submitted query
    // Clear previous suggestions when starting new search
    setFollowUpSuggestions([]);
    // Match chat component: only check if empty or loading
    if (!query.trim() || searching) {
      return;
    }

    // Set initial loading text (will be updated with context-aware message after intent is parsed)
    setCurrentLoadingText('Finding the perfect spots...');

    setSearching(true);
    setSearchTier('ai-enhanced');
    setSearchIntent(null);

    try {
      // Match chat component exactly - build history from existing conversation
      // Chat component maps messages array (which doesn't include current query yet due to async state)
      const historyForAPI = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // ALL queries go through AI chat - no exceptions
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userId: user?.id,
          conversationHistory: historyForAPI, // History WITHOUT current query (matches chat component)
        }),
      });

      if (!response.ok) {
        throw new Error('AI chat failed');
      }

      const data = await response.json();

      // Update search tier
      setSearchTier(data.searchTier || 'ai-chat');

      // Update conversation history for API context (not displayed)
      const userMessage = { role: 'user' as const, content: query };
      const assistantMessage = { role: 'assistant' as const, content: data.content || '', destinations: data.destinations };
      
      const newHistory = [
        ...conversationHistory,
        userMessage,
        assistantMessage
      ];
      setConversationHistory(newHistory.slice(-10)); // Keep last 10 messages for context

      // Store enhanced intent data for intelligent feedback
      if (data.intent) {
        setSearchIntent(data.intent);
        
        // Store inferred tags for refinement chips
        if (data.inferredTags) {
          setInferredTags(data.inferredTags);
        } else {
          setInferredTags(null);
        }
        
        // Fetch seasonal context if city is detected
        let seasonData = null;
        if (data.intent.city) {
          try {
            const seasonResponse = await fetch(`/api/seasonality?city=${encodeURIComponent(data.intent.city)}`);
            if (seasonResponse.ok) {
              seasonData = await seasonResponse.json();
              setSeasonalContext(seasonData);
            }
          } catch (error) {
            // Silently fail - seasonal context is optional
          }
        } else {
          setSeasonalContext(null);
        }

        // Update loading text with context-aware message based on intent
        const contextAwareText = getContextAwareLoadingMessage(
          query,
          data.intent,
          seasonData,
          userContext
        );
        setCurrentLoadingText(contextAwareText);
      } else {
        // Fallback to context-aware message even without intent
        const contextAwareText = getContextAwareLoadingMessage(query, null, seasonalContext, userContext);
        setCurrentLoadingText(contextAwareText);
      }

      // ONLY show the latest AI response (simple text)
      setChatResponse(data.content || '');
      
      // ALWAYS set destinations array
      const destinations = data.destinations || [];
      setFilteredDestinations(destinations);

      // Store follow-up suggestions from API response
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setFollowUpSuggestions(data.suggestions);
      } else {
        setFollowUpSuggestions([]);
      }

      // Add messages to visual chat history
      const contextPrompt = getContextAwareLoadingMessage(query);
      setChatMessages(prev => [
        ...prev,
        { type: 'user', content: query },
        { type: 'assistant', content: data.content || '', contextPrompt: destinations.length > 0 ? contextPrompt : undefined }
      ]);
    } catch (error) {
      console.error('AI chat error:', error);
      setChatResponse('Sorry, I encountered an error. Please try again.');
      setFilteredDestinations([]);
      setSearchIntent(null);
      setSeasonalContext(null);
      setFollowUpSuggestions([]);

      // Add error message to chat
      setChatMessages(prev => [
        ...prev,
        { type: 'user', content: query },
        { type: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setSearching(false);
    }
  }, [user, searching, conversationHistory, trackAction]);

  // Convert inferredTags to RefinementTag array
  const convertInferredTagsToRefinementTags = useCallback((
    tags: { neighborhoods?: string[]; styleTags?: string[]; priceLevel?: string; modifiers?: string[] },
    activeFilters: Set<string>,
    activeOnly: boolean
  ): RefinementTag[] => {
    const result: RefinementTag[] = [];
    
    if (tags.neighborhoods) {
      tags.neighborhoods.forEach((neighborhood) => {
        const key = `neighborhood-${neighborhood}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'neighborhood',
            value: neighborhood,
            label: neighborhood,
          });
        }
      });
    }
    
    if (tags.styleTags) {
      tags.styleTags.forEach((style) => {
        const key = `style-${style}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'style',
            value: style,
            label: style,
          });
        }
      });
    }
    
    if (tags.priceLevel) {
      const key = `price-${tags.priceLevel}`;
      const isActive = activeFilters.has(key);
      if (activeOnly ? isActive : !isActive) {
        result.push({
          type: 'price',
          value: tags.priceLevel,
          label: tags.priceLevel,
        });
      }
    }
    
    if (tags.modifiers) {
      tags.modifiers.forEach((modifier) => {
        const key = `modifier-${modifier}`;
        const isActive = activeFilters.has(key);
        if (activeOnly ? isActive : !isActive) {
          result.push({
            type: 'modifier',
            value: modifier,
            label: modifier,
          });
        }
      });
    }
    
    return result;
  }, []);

  // Handle chip click - add filter and rebuild search
  const handleChipClick = useCallback((tag: RefinementTag) => {
    const key = `${tag.type}-${tag.value}`;
    const newActiveFilters = new Set(activeFilters);
    
    if (newActiveFilters.has(key)) {
      newActiveFilters.delete(key);
            } else {
      newActiveFilters.add(key);
      
      // Track filter action for sequence prediction
      trackAction({
        type: 'filter',
      });
    }
    
    setActiveFilters(newActiveFilters);
    
    // Rebuild search query with active filters
    if (submittedQuery) {
      const filterParts: string[] = [];
      newActiveFilters.forEach((filterKey) => {
        const [type, value] = filterKey.split('-', 2);
        filterParts.push(value);
      });
      
      const enhancedQuery = filterParts.length > 0
        ? `${submittedQuery} ${filterParts.join(' ')}`
        : submittedQuery;
      
      performAISearch(enhancedQuery);
    }
  }, [activeFilters, submittedQuery, performAISearch, trackAction]);

  // Handle chip remove - remove filter and rebuild search
  const handleChipRemove = useCallback((tag: RefinementTag) => {
    const key = `${tag.type}-${tag.value}`;
    const newActiveFilters = new Set(activeFilters);
    newActiveFilters.delete(key);
    setActiveFilters(newActiveFilters);
    
    // Rebuild search query without removed filter
    if (submittedQuery) {
      const filterParts: string[] = [];
      newActiveFilters.forEach((filterKey) => {
        const [type, value] = filterKey.split('-', 2);
        filterParts.push(value);
      });
      
      const enhancedQuery = filterParts.length > 0
        ? `${submittedQuery} ${filterParts.join(' ')}`
        : submittedQuery;
      
      performAISearch(enhancedQuery);
    }
  }, [activeFilters, submittedQuery, performAISearch]);

  // Handle location changes from Near Me filter
  const handleLocationChange = async (lat: number | null, lng: number | null, radius: number) => {
    if (!lat || !lng) {
      setUserLocation(null);
      setNearbyDestinations([]);
      return;
    }

    setUserLocation({ lat, lng });

    try {
      console.log(`[Near Me] Fetching destinations within ${radius}km of ${lat}, ${lng}`);
      const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`);
      const data = await response.json();

      if (data.error) {
        console.error('[Near Me] API error:', data.error, data.details);
        setNearbyDestinations([]);
        return;
      }

      console.log(`[Near Me] Found ${data.count} destinations`, data.usesFallback ? '(using fallback)' : '(using database function)');

      if (data.destinations) {
        setNearbyDestinations(data.destinations);
      } else {
        setNearbyDestinations([]);
      }
    } catch (error) {
      console.error('[Near Me] Error fetching nearby destinations:', error);
      setNearbyDestinations([]);
    }
  };

  // Pinterest-like recommendation algorithm
  const getRecommendationScore = (dest: Destination, index: number): number => {
    let score = 0;

    // Priority signals (like Pinterest's quality score)
    if (dest.crown) score += 20; // Crown badge = featured (reduced from 50)
    if (dest.image) score += 10; // Images get boost
    // Michelin stars are displayed but don't affect ranking

    // Category diversity bonus (ensures mixed content like Pinterest)
    const categoryBonus = (index % 7) * 5; // Rotate through categories (increased from 2)
    score += categoryBonus;

    // Random discovery factor (increased for more serendipity)
    score += Math.random() * 30;

    return score;
  };

  // Helper function to check if Supabase error should be ignored (common pattern)
  const isIgnorableSupabaseError = useCallback((error: any): boolean => {
    if (!error) return false;
    const message = error.message || String(error);
    return message.includes('hostname') || 
           message.includes('Failed to fetch') || 
           message.includes('invalid.supabase') ||
           message.includes('timeout') ||
           message.includes('Network') ||
           message.includes('connection') ||
           message.includes('Connection lost') ||
           message.includes('network connection was lost');
  }, []);

  // Memoized filter function to avoid recreating on every render
  // Helper function to filter destinations with explicit data (avoids stale state)
  // Accepts current filter values to avoid closure issues
  // MOVED BEFORE fetchDestinations to fix "used before declaration" error

  // OPTIMIZATION: Memoize filtered destinations to avoid recalculating on every render
  const filteredDestinationsMemo = useMemo(() => {
    return filterDestinationsWithData(destinations);
  }, [destinations, filterDestinationsWithData]);

  // Update filtered destinations when memoized value changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDestinations(filteredDestinationsMemo);
    }
  }, [filteredDestinationsMemo, searchTerm]);

  const filterDestinations = useCallback(() => {
    const filtered = filterDestinationsWithData(destinations);
    setFilteredDestinations(filtered);
  }, [destinations, filterDestinationsWithData]);

  // Display featured cities (Taipei, Tokyo, New York, London) if they exist in the cities list
  const displayedCities = FEATURED_CITIES.filter(city => cities.includes(city));

  return (
    <ErrorBoundary>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.urbanmanual.co/#organization',
                name: 'The Urban Manual',
                url: 'https://www.urbanmanual.co',
                description: 'Curated guide to world\'s best hotels, restaurants & travel destinations',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.urbanmanual.co/logo.png',
                },
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.urbanmanual.co/#website',
                url: 'https://www.urbanmanual.co',
                name: 'The Urban Manual',
                publisher: {
                  '@id': 'https://www.urbanmanual.co/#organization',
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://www.urbanmanual.co/search?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }),
        }}
      />
      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        {/* SEO H1 - Visually hidden but accessible to search engines */}
        <h1 className="sr-only">Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual</h1>
        {/* Hero Section - Separate section, never overlaps with grid */}
        <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
          <div className="w-full flex md:justify-start flex-1 items-center">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
              {/* Greeting - Always vertically centered */}
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  {/* Show GreetingHero only when no active search */}
                  {!submittedQuery && (
                    <>
                      {/* Session Resume - Show if there's a recent session */}
                      {showSessionResume && lastSession && (
                        <div className="mb-6">
                          <SessionResume
                            session={lastSession}
                            onResume={handleResumeSession}
                            onDismiss={() => setShowSessionResume(false)}
                          />
                        </div>
                      )}

                      {/* Context Cards - Show user's saved preferences */}
                      {userContext && user && !searchTerm && (
                        <div className="mb-6">
                          <ContextCards context={userContext} />
                        </div>
                      )}

                  <GreetingHero
                searchQuery={searchTerm}
                onSearchChange={(value) => {
                  setSearchTerm(value);
                  // Clear conversation history only if search is cleared
                  if (!value.trim()) {
                    setConversationHistory([]);
                    setSearchIntent(null);
                    setSeasonalContext(null);
                    setSearchTier(null);
                    setChatResponse('');
                    setFilteredDestinations([]);
                            setSubmittedQuery('');
                  }
                }}
                onSubmit={(query) => {
                  // CHAT MODE: Explicit submit on Enter key (like chat component)
                  if (query.trim() && !searching) {
                    performAISearch(query);
                  }
                }}
                userName={(function () {
                  const raw = ((user?.user_metadata as any)?.name || (user?.email ? user.email.split('@')[0] : undefined)) as string | undefined;
                  if (!raw) return undefined;
                  return raw
                    .split(/[\s._-]+/)
                    .filter(Boolean)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                })()}
                        userProfile={userProfile}
                        lastSession={lastSession}
                        enrichedContext={enrichedGreetingContext}
                isAIEnabled={isAIEnabled}
                isSearching={searching}
                filters={advancedFilters}
                onFiltersChange={(newFilters) => {
                  setAdvancedFilters(newFilters);
                  // Sync with legacy state for backward compatibility
                  if (newFilters.city !== undefined) {
                    setSelectedCity(newFilters.city || '');
                  }
                  if (newFilters.category !== undefined) {
                    setSelectedCategory(newFilters.category || '');
                  }
                  // Track filter changes
                  Object.entries(newFilters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                      trackFilterChange({ filterType: key, value });
                    }
                  });
                }}
                availableCities={cities}
                availableCategories={categories}
                  />
                    </>
                  )}

                  {/* Chat-like display when search is active */}
                  {submittedQuery && (
                    <div className="w-full">
                      {/* Greeting */}
                      <div className="text-left mb-6">
                        <h2 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
                          {(() => {
                            const now = new Date();
                            const currentHour = now.getHours();
                            let greeting = 'GOOD EVENING';
                            if (currentHour < 12) greeting = 'GOOD MORNING';
                            else if (currentHour < 18) greeting = 'GOOD AFTERNOON';

                            const userName = (function () {
                              const raw = ((user?.user_metadata as any)?.name || (user?.email ? user.email.split('@')[0] : undefined)) as string | undefined;
                              if (!raw) return undefined;
                              return raw
                                .split(/[\s._-]+/)
                                .filter(Boolean)
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ');
                            })();

                            return `${greeting}${userName ? `, ${userName}` : ''}`;
                          })()}
                        </h2>
                      </div>

                      {/* Refinement Chips - Active Filters */}
                      {inferredTags && !searching && (() => {
                        const activeTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, true);
                        if (activeTags.length === 0) return null;
                        return (
                          <div className="mb-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filtered by:</div>
                            <RefinementChips
                              tags={activeTags}
                              onChipClick={(tag) => handleChipClick(tag)}
                              onChipRemove={(tag) => handleChipRemove(tag)}
                              activeTags={activeFilters}
                            />
                          </div>
                        );
                      })()}

                      {/* Refinement Chips - Suggestions */}
                      {inferredTags && !searching && (() => {
                        const suggestionTags = convertInferredTagsToRefinementTags(inferredTags, activeFilters, false);
                        if (suggestionTags.length === 0) return null;
                        return (
                          <div className="mb-6">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</div>
                            <RefinementChips
                              tags={suggestionTags}
                              onChipClick={(tag) => handleChipClick(tag)}
                              activeTags={activeFilters}
                            />
                          </div>
                        );
                      })()}

                      {/* Scrollable chat history - Fixed height for about 2 message pairs */}
                      <div
                        ref={chatContainerRef}
                        className="max-h-[400px] overflow-y-auto space-y-6 mb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
                      >
                        {chatMessages.length > 0 ? (
                          chatMessages.map((message, index) => (
                            <div key={index} className="space-y-2">
                              {message.type === 'user' ? (
                                <div className="text-left text-xs uppercase tracking-[2px] font-medium text-black dark:text-white">
                                  {message.content}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <MarkdownRenderer
                                    content={message.content}
                                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                                  />
                                  {message.contextPrompt && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed text-left italic">
                                      {message.contextPrompt}
                                    </div>
                                  )}
                                  {/* Show follow-up suggestions after the last assistant message */}
                                  {index === chatMessages.length - 1 && followUpSuggestions.length > 0 && (
                                    <FollowUpSuggestions
                                      suggestions={followUpSuggestions}
                                      onSuggestionClick={(suggestion) => {
                                        setSearchTerm(suggestion);
                                        setFollowUpInput('');
                                        performAISearch(suggestion);
                                      }}
                                      isLoading={searching}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : null}

                        {/* Loading State - Show when searching OR when submittedQuery exists but no messages yet */}
                        {(searching || (submittedQuery && chatMessages.length === 0)) && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      <div className="flex items-center gap-2">
                              {discoveryEngineLoading && (
                                <div className="flex gap-1">
                                  <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}>.</span>
                                  <span className="animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}>.</span>
                                  <span className="animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}>.</span>
                                </div>
                              )}
                              <span>{currentLoadingText}</span>
                      </div>
                    </div>
                  )}
                      </div>

                      {/* Follow-up input field - Chat style */}
                      {!searching && chatMessages.length > 0 && (
                        <div className="relative">
                          <input
                            placeholder="Refine your search or ask a follow-up..."
                            value={followUpInput}
                            onChange={(e) => setFollowUpInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && followUpInput.trim()) {
                                e.preventDefault();
                                const query = followUpInput.trim();
                                setSearchTerm(query);
                                setFollowUpInput('');
                                performAISearch(query);
                              }
                            }}
                            className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60"
                          />
                        </div>
                      )}

                      {/* Intent Confirmation Chips - Always under text input */}
                      {searchIntent && !searching && (
                        <div className="mt-4">
                          <IntentConfirmationChips
                            intent={searchIntent}
                            onChipRemove={(chipType, value) => {
                              // Modify the search based on what was removed
                              setSearchTerm('');
                              setSubmittedQuery('');
                              setSearchIntent(null);
                              setInferredTags(null);
                              setActiveFilters(new Set());
                            }}
                            editable={true}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* No results message */}
                  {submittedQuery && !searching && filteredDestinations.length === 0 && !chatResponse && (
                    <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      <span>No results found. Try refining your search.</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* City and Category Lists - Uses space below greeting, aligned to bottom */}
              {!submittedQuery && (
                <div className="flex-1 flex items-end">
                  <div className="w-full pt-6">
                    {/* City List - Only shows Taipei, Tokyo, New York, and London */}
                    <div className="mb-[50px]">
                      {/* CITIES Heading */}
                      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                        CITIES
                      </div>
                      
                      {/* City Buttons */}
                      <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCity("");
                            setCurrentPage(1);
                            trackFilterChange({ filterType: 'city', value: 'all' });
                          }}
                          className={`transition-all duration-200 ease-out ${
                            !selectedCity
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                          }`}
                        >
                          All Cities
                        </button>
                        {displayedCities.map((city) => (
                          <button
                            key={city}
                            onClick={() => {
                              const newCity = city === selectedCity ? "" : city;
                              setSelectedCity(newCity);
                              setCurrentPage(1);
                              trackFilterChange({ filterType: 'city', value: newCity || 'all' });
                            }}
                            className={`transition-all duration-200 ease-out ${
                              selectedCity === city
                                ? "font-medium text-black dark:text-white"
                                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                            }`}
                          >
                            {capitalizeCity(city)}
                          </button>
                        ))}
                      </div>
                      
                      {/* More Cities Button */}
                      {cities.length > displayedCities.length && (
                        <button
                          onClick={() => {
                            // Show all cities except the featured ones
                            const remainingCities = cities.filter(city => !FEATURED_CITIES.includes(city));
                            // For now, just expand to show all cities
                            // In the future, could implement a modal or expandable section
                          }}
                          className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-colors duration-200 ease-out"
                        >
                          + More cities ({cities.length - displayedCities.length})
                        </button>
                      )}
                    </div>
                    
                    {/* Category List (including Michelin) */}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setAdvancedFilters(prev => ({ ...prev, category: undefined, michelin: undefined }));
                            setCurrentPage(1);
                            trackFilterChange({ filterType: 'category', value: 'all' });
                          }}
                          className={`transition-all duration-200 ease-out ${
                            !selectedCategory && !advancedFilters.michelin
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                          }`}
                        >
                          All Categories
                        </button>
                        {/* Michelin right after All Categories */}
                        <button
                          onClick={() => {
                            const newValue = !advancedFilters.michelin;
                            setSelectedCategory("");
                            setAdvancedFilters(prev => ({ ...prev, category: undefined, michelin: newValue || undefined }));
                            setCurrentPage(1);
                            trackFilterChange({ filterType: 'michelin', value: newValue });
                          }}
                          className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                            advancedFilters.michelin
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
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
                        {categories.map((category) => {
                          const IconComponent = getCategoryIcon(category);
                          return (
                          <button
                            key={category}
                            onClick={() => {
                              const newCategory = category === selectedCategory ? "" : category;
                              setSelectedCategory(newCategory);
                                setAdvancedFilters(prev => ({ ...prev, category: newCategory || undefined, michelin: undefined }));
                                setCurrentPage(1);
                              trackFilterChange({ filterType: 'category', value: newCategory || 'all' });
                            }}
                              className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                                selectedCategory === category && !advancedFilters.michelin
                                ? "font-medium text-black dark:text-white"
                                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                            }`}
                          >
                              {IconComponent && (
                                <IconComponent className="h-3 w-3" size={12} />
                              )}
                            {capitalizeCategory(category)}
                          </button>
                          );
                        })}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

              {/* Content Section - Grid directly below hero */}
              <div className="w-full px-6 md:px-10 pb-12 mt-8">
                <div className="max-w-[1800px] mx-auto">
                {/* Filter and View Toggle - Top right of grid section */}
                <div className="mb-8 md:mb-10">
                  <div className="flex justify-end items-center gap-3 relative flex-wrap">
                    {/* Wrapper for Filter and Map Toggle to ensure alignment */}
                    <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                      {/* Filter Button - Expands inline below */}
                      <div className="w-full md:w-auto">
                        <SearchFiltersComponent
                          filters={advancedFilters}
                          onFiltersChange={(newFilters) => {
                            setAdvancedFilters(newFilters);
                            if (newFilters.city !== undefined) {
                              setSelectedCity(newFilters.city || '');
                            }
                            if (newFilters.category !== undefined) {
                              setSelectedCategory(newFilters.category || '');
                            }
                            Object.entries(newFilters).forEach(([key, value]) => {
                              if (value !== undefined && value !== null && value !== '') {
                                trackFilterChange({ filterType: key, value });
                              }
                            });
                          }}
                          availableCities={cities}
                          availableCategories={categories}
                          onLocationChange={handleLocationChange}
                          sortBy={sortBy}
                          onSortChange={(newSort) => {
                            setSortBy(newSort);
                            setCurrentPage(1);
                          }}
                          isAdmin={isAdmin}
                        />
                      </div>

                      {/* Grid/Map Toggle */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex-shrink-0">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full ${
                            viewMode === 'grid'
                              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          aria-label="Grid view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                          <span>Grid</span>
                        </button>
                        <button
                          onClick={() => setViewMode('map')}
                          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full ${
                            viewMode === 'map'
                              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          aria-label="Map view"
                        >
                          <Map className="h-4 w-4" />
                          <span>Map</span>
                        </button>
                      </div>
                    </div>

                    {/* Create Trip / Add New POI Button */}
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          setEditingDestination(null);
                          setShowPOIDrawer(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:ring-offset-2"
                        aria-label="Add New POI"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-sm font-medium">Add New POI</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowTripPlanner(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:ring-offset-2"
                        aria-label="Create Trip"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-sm font-medium">Create Trip</span>
                      </button>
                    )}
                  </div>
                </div>
            

            {/* Smart Recommendations - Show only when user is logged in and no active search */}
            {user && !submittedQuery && !selectedCity && !selectedCategory && (
              <div className="mb-12 md:mb-16">
                <SmartRecommendations
                onCardClick={(destination) => {
                  setSelectedDestination(destination);
                  setIsDrawerOpen(true);

                  // Track destination click
                  trackDestinationClick({
                    destinationSlug: destination.slug,
                    position: 0,
                    source: 'smart_recommendations',
                  });

                  // Track for sequence prediction
                  trackAction({
                    type: 'click',
                    destination_id: destination.id,
                    destination_slug: destination.slug,
                  });

                  // Also track with new analytics system
                  if (destination.id) {
                    import('@/lib/analytics/track').then(({ trackEvent }) => {
                      trackEvent({
                        event_type: 'click',
                        destination_id: destination.id,
                        destination_slug: destination.slug,
                        metadata: {
                          category: destination.category,
                          city: destination.city,
                          source: 'smart_recommendations',
                        },
                      });
                    });
                  }

                  // Track click event to Discovery Engine for personalization
                  if (user?.id) {
                    fetch('/api/discovery/track-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        eventType: 'click',
                        documentId: destination.slug,
                        source: 'smart_recommendations',
                      }),
                    }).catch((error) => {
                      console.warn('Failed to track Discovery Engine event:', error);
                    });
                  }
                }}
              />
              </div>
            )}
            
            {/* Sequence Predictions - Show after user has performed some actions */}
            {user && predictions && predictions.predictions && predictions.predictions.length > 0 && !submittedQuery && (
              <div className="mb-8">
                <SequencePredictionsInline 
                  predictions={predictions.predictions} 
                  compact={false}
                />
              </div>
            )}

            {/* Trending Section - ML-powered Prophet forecasting */}
            {!submittedQuery && (
              <div className="mb-12 md:mb-16">
                <TrendingSectionML limit={12} forecastDays={7} />
              </div>
            )}

            {/* Near Me - No Results Message */}
            {advancedFilters.nearMe && userLocation && nearbyDestinations.length === 0 && (
              <div className="text-center py-12 px-4">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  No destinations found nearby
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                  We couldn't find any destinations within {advancedFilters.nearMeRadius || 5}km of your location.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                  This feature requires destination coordinates to be populated.
                  <br />
                  See <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/DEPLOYMENT_GUIDE.md</code> for setup instructions.
                </p>
              </div>
            )}

            {/* Destination Grid - Original design */}
                {(() => {
              // Determine which destinations to show
              const displayDestinations = advancedFilters.nearMe && nearbyDestinations.length > 0
                ? nearbyDestinations
                : filteredDestinations;

              // Always render the grid structure, even if empty (for instant page load)
              // Show empty state if no destinations
              if (displayDestinations.length === 0 && !advancedFilters.nearMe) {
                return (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Loading destinations...
                    </p>
                  </div>
                );
              }
              
              if (displayDestinations.length === 0 && advancedFilters.nearMe) {
                return null; // Message shown above
              }

              return (
                <>
                  {viewMode === 'map' ? (
                    <div className="w-full h-[calc(100vh-20rem)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative">
                      <MapView
                        destinations={displayDestinations}
                        onMarkerClick={(dest) => {
                          setSelectedDestination(dest);
                          setIsDrawerOpen(true);
                        }}
                      />
                    </div>
                  ) : (
                    (() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                      const paginatedDestinations = displayDestinations.slice(startIndex, endIndex);

                  return (
                    <UniversalGrid
                      items={paginatedDestinations}
                      renderItem={(destination, index) => {
                        const isVisited = !!(user && visitedSlugs.has(destination.slug));
                        const globalIndex = startIndex + index;
                        
                        return (
                          <DestinationCard
                            key={destination.slug}
                            destination={destination}
                            isAdmin={isAdmin}
                            onEdit={(dest) => {
                              setEditingDestination(dest);
                              setShowPOIDrawer(true);
                            }}
                            onClick={() => {
                              setSelectedDestination(destination);
                              setIsDrawerOpen(true);

                              // Track destination click
                              trackDestinationClick({
                                destinationSlug: destination.slug,
                                position: globalIndex,
                                source: 'grid',
                              });
                              
                              // Also track with new analytics system
                              if (destination.id) {
                                import('@/lib/analytics/track').then(({ trackEvent }) => {
                                  trackEvent({
                                    event_type: 'click',
                                    destination_id: destination.id,
                                    destination_slug: destination.slug,
                                    metadata: {
                                      category: destination.category,
                                      city: destination.city,
                                      source: 'homepage_grid',
                                      position: globalIndex,
                                    },
                                  });
                                });
                              }
                                
                              // Track click event to Discovery Engine for personalization
                              if (user?.id) {
                                fetch('/api/discovery/track-event', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: user.id,
                                    eventType: 'click',
                                    documentId: destination.slug,
                                  }),
                                }).catch((error) => {
                                  console.warn('Failed to track click event:', error);
                                });
                              }
                            }}
                            index={globalIndex}
                            isVisited={isVisited}
                            showBadges={true}
                          />
                        );
                      }}
                    />
                  );
                    })()
                  )}

                  {/* Pagination - Only show in grid view */}
                  {viewMode === 'grid' && (() => {
                    const totalPages = Math.ceil(displayDestinations.length / itemsPerPage);
            if (totalPages <= 1) return null;
            
            return (
                      <div className="mt-12 w-full flex flex-wrap items-center justify-center gap-2">
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    const isActive = currentPage === pageNum;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                          isActive
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                        aria-label={`Page ${pageNum}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {pageNum}
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
            );
          })()}

                  {/* Ad below pagination */}
                  {displayDestinations.length > 0 && (
                    <div className="mt-8 w-full">
                      <MultiplexAd slot="3271683710" />
                    </div>
                  )}
                </>
              );
            })()}
                </div>
          </div>

          {/* Destination Drawer */}
          <DestinationDrawer
            destination={selectedDestination}
            isOpen={isDrawerOpen}
            onClose={() => {
              // Sort visited items to the back when closing
              setFilteredDestinations(prev => {
                const sorted = [...prev].sort((a, b) => {
                  const aVisited = user && visitedSlugs.has(a.slug);
                  const bVisited = user && visitedSlugs.has(b.slug);
                  if (aVisited && !bVisited) return 1;
                  if (!aVisited && bVisited) return -1;
                  return 0;
                });
                return sorted;
              });
              setIsDrawerOpen(false);
              setTimeout(() => setSelectedDestination(null), 300);
            }}
            onVisitToggle={(slug, visited) => {
              // Update visited slugs
              setVisitedSlugs(prev => {
                const newSet = new Set(prev);
                if (visited) {
                  newSet.add(slug);
                } else {
                  newSet.delete(slug);
                }
                return newSet;
              });
              
              // Sort visited items to the back
              setFilteredDestinations(prev => {
                const sorted = [...prev].sort((a, b) => {
                  const aVisited = user && (visitedSlugs.has(a.slug) || (visited && a.slug === slug));
                  const bVisited = user && (visitedSlugs.has(b.slug) || (visited && b.slug === slug));
                  if (aVisited && !bVisited) return 1;
                  if (!aVisited && bVisited) return -1;
                  return 0;
                });
                return sorted;
              });
            }}
          />

          {/* Trip Planner Modal */}
          <TripPlanner
            isOpen={showTripPlanner}
            onClose={() => setShowTripPlanner(false)}
          />

          {/* POI Drawer (Admin only) */}
          {isAdmin && (
            <POIDrawer
              isOpen={showPOIDrawer}
              onClose={() => {
                setShowPOIDrawer(false);
                setEditingDestination(null);
              }}
              destination={editingDestination}
              onSave={async () => {
                // Refresh destinations immediately after creating/updating/deleting POI
                // Small delay to ensure database transaction is committed
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Fetch fresh destinations (this will automatically apply current filters)
                await fetchDestinations();
                
                // Reset to first page to show the newly created POI at the top
                setCurrentPage(1);
                
                setEditingDestination(null);
              }}
            />
          )}
      </main>
    </ErrorBoundary>
  );
}
