"use client";

/**
 * HomepageClient - Client-side interactive component for the homepage
 *
 * OPTIMIZED:
 * - Receives minimal data from server (50 destinations, essential fields)
 * - Fetches user data client-side (non-blocking SSR)
 * - Lazy loads more destinations on scroll/pagination
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Destination } from "@/types/destination";
import { UserProfile } from "@/types/personalization";
import {
  Map,
  LayoutGrid,
  Plus,
  X,
  Globe,
  Loader2,
} from "lucide-react";
import { getCategoryIconComponent } from "@/lib/icons/category-icons";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSequenceTracker } from "@/hooks/useSequenceTracker";
import Image from "next/image";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackFilterChange,
} from "@/lib/tracking";
import GreetingHero from "@/src/features/search/GreetingHero";
import { SearchFiltersComponent } from "@/src/features/search/SearchFilters";
import { type ExtractedIntent } from "@/app/api/intent/schema";
import { capitalizeCity } from "@/lib/utils";
import { isOpenNow } from "@/lib/utils/opening-hours";
import { DestinationCard } from "@/components/DestinationCard";
import { DestinationGridSkeleton } from "@/ui/DestinationCardSkeleton";
import HomeMapSplitView from "@/components/HomeMapSplitView";
import { EditModeToggle } from "@/components/EditModeToggle";
import { useItemsPerPage } from "@/hooks/useGridColumns";
import { getContextAwareLoadingMessage } from "@/src/lib/context/loading-message";
import { useAdminEditMode } from "@/contexts/AdminEditModeContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useDrawer } from "@/contexts/DrawerContext";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@supabase/supabase-js";

// Import IntelligentDrawer hook
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';

// Lazy load heavy components
const SmartRecommendations = dynamic(
  () =>
    import("@/components/SmartRecommendations").then((mod) => ({
      default: mod.SmartRecommendations,
    })),
  { ssr: false }
);

const SequencePredictionsInline = dynamic(
  () =>
    import("@/components/SequencePredictionsInline").then((mod) => ({
      default: mod.SequencePredictionsInline,
    })),
  { ssr: false }
);

const TrendingSectionML = dynamic(
  () =>
    import("@/components/TrendingSectionML").then((mod) => ({
      default: mod.TrendingSectionML,
    })),
  { ssr: false }
);

const MarkdownRenderer = dynamic(
  () =>
    import("@/src/components/MarkdownRenderer").then((mod) => ({
      default: mod.MarkdownRenderer,
    })),
  { ssr: false }
);

const SessionResume = dynamic(
  () =>
    import("@/components/SessionResume").then((mod) => ({
      default: mod.SessionResume,
    })),
  { ssr: false }
);

const ContextCards = dynamic(
  () =>
    import("@/components/ContextCards").then((mod) => ({
      default: mod.ContextCards,
    })),
  { ssr: false }
);

const IntentConfirmationChips = dynamic(
  () =>
    import("@/components/IntentConfirmationChips").then((mod) => ({
      default: mod.IntentConfirmationChips,
    })),
  { ssr: false }
);

const FollowUpSuggestions = dynamic(
  () =>
    import("@/components/FollowUpSuggestions").then((mod) => ({
      default: mod.FollowUpSuggestions,
    })),
  { ssr: false }
);

// Featured cities to show first
const FEATURED_CITIES = ["Taipei", "Tokyo", "New York", "London"];

// Minimal destination type (matches server)
type MinimalDestination = Pick<
  Destination,
  | "id"
  | "slug"
  | "name"
  | "city"
  | "country"
  | "category"
  | "image"
  | "image_thumbnail"
  | "michelin_stars"
  | "crown"
  | "rating"
  | "price_level"
  | "micro_description"
>;

// Props interface - simplified, user data fetched client-side
export interface HomepageClientProps {
  initialDestinations: MinimalDestination[];
  initialCities: string[];
  initialCategories: string[];
  totalCount: number;
}

function getCategoryIcon(
  category: string
): React.ComponentType<{ className?: string; size?: number | string }> | null {
  return getCategoryIconComponent(category);
}

function capitalizeCategory(category: string): string {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function HomepageClient({
  initialDestinations,
  initialCities,
  initialCategories,
  totalCount,
}: HomepageClientProps) {
  const router = useRouter();
  const { user } = useAuth(); // Fetch user client-side (non-blocking)
  const {
    isEditMode: adminEditMode,
    toggleEditMode,
    disableEditMode,
    canUseEditMode,
  } = useAdminEditMode();
  const { trackAction, predictions } = useSequenceTracker();
  const { openDrawer: openGlobalDrawer } = useDrawerStore();
  const { openDrawer, closeDrawer } = useDrawer();

  // Initialize state with server-provided data (minimal)
  const [destinations, setDestinations] = useState<MinimalDestination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<MinimalDestination[]>(initialDestinations);
  const [cities, setCities] = useState<string[]>(initialCities);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  // User data - fetched client-side (non-blocking SSR)
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Loading state for initial data fetch
  const [isInitialLoading, setIsInitialLoading] = useState(initialDestinations.length === 0);

  // Loading more destinations
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialDestinations.length < totalCount);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAllCities, setShowAllCities] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "recent">("default");
  const [searching, setSearching] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  // Drawer now handled by IntelligentDrawer
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  // Chat/Search state
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{
      type: "user" | "assistant";
      content: string;
      contextPrompt?: string;
      tripId?: string;
    }>
  >([]);
  const [chatResponse, setChatResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<
    Array<{
      text: string;
      icon?: "location" | "time" | "price" | "rating" | "default";
      type?: "refine" | "expand" | "related";
    }>
  >([]);
  const [searchIntent, setSearchIntent] = useState<ExtractedIntent | null>(null);
  const [seasonalContext, setSeasonalContext] = useState<any>(null);

  // Session/context state
  const [lastSession, setLastSession] = useState<any>(null);
  const [showSessionResume, setShowSessionResume] = useState(false);
  const [userContext, setUserContext] = useState<{
    favoriteCities: string[];
    favoriteCategories: string[];
    travelStyle?: string;
  } | null>(null);
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<any>(null);

  // Advanced filters
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

  // Near me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSearchedQueryRef = useRef<string>("");
  const gridSwipeState = useRef({
    startX: 0,
    startY: 0,
    isActive: false,
    isHorizontal: false,
  });

  // Hooks
  const itemsPerPage = useItemsPerPage(4);
  const editModeActive = isAdmin && adminEditMode;
  const isDestinationsLoading = searching || loadingMore || isInitialLoading;

  // Loading message
  const currentLoadingText = useMemo(() => {
    // Adapt ExtractedIntent to LoadingIntent format
    const loadingIntent = searchIntent
      ? {
          city: searchIntent.city ?? undefined,
          category: searchIntent.category ?? undefined,
          modifiers: searchIntent.modifiers,
          temporalContext: searchIntent.temporalContext
            ? {
                timeframe: searchIntent.temporalContext.timeframe,
                timeOfDay: searchIntent.constraints?.time?.timeOfDay ?? undefined,
              }
            : undefined,
          primaryIntent: searchIntent.primaryIntent,
        }
      : null;
    return getContextAwareLoadingMessage(
      submittedQuery,
      loadingIntent,
      seasonalContext
    );
  }, [submittedQuery, searchIntent, seasonalContext]);

  // Filter destinations helper
  const filterDestinationsWithData = useCallback(
    (
      sourceDestinations: Destination[] = destinations,
      searchQuery: string = "",
      filters: typeof advancedFilters = advancedFilters,
      city: string = selectedCity,
      category: string = selectedCategory,
      currentUser: User | null = user,
      visited: Set<string> = visitedSlugs
    ): Destination[] => {
      let filtered = [...sourceDestinations];

      // Apply city filter
      if (city || filters.city) {
        const filterCity = city || filters.city;
        filtered = filtered.filter(
          (d) => d.city?.toLowerCase() === filterCity?.toLowerCase()
        );
      }

      // Apply category filter
      if (category || filters.category) {
        const filterCategory = (category || filters.category)?.toLowerCase();
        filtered = filtered.filter((d) => {
          if (d.category?.toLowerCase() === filterCategory) return true;
          if (d.tags?.some((t) => t.toLowerCase() === filterCategory)) return true;
          return false;
        });
      }

      // Apply michelin filter
      if (filters.michelin) {
        filtered = filtered.filter((d) => d.michelin_stars && d.michelin_stars > 0);
      }

      // Apply crown filter
      if (filters.crown) {
        filtered = filtered.filter((d) => d.crown === true);
      }

      // Apply price filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        filtered = filtered.filter((d) => {
          if (!d.price_level) return true;
          if (filters.minPrice !== undefined && d.price_level < filters.minPrice)
            return false;
          if (filters.maxPrice !== undefined && d.price_level > filters.maxPrice)
            return false;
          return true;
        });
      }

      // Apply rating filter
      if (filters.minRating !== undefined) {
        filtered = filtered.filter(
          (d) => d.rating && d.rating >= (filters.minRating || 0)
        );
      }

      // Apply open now filter
      if (filters.openNow) {
        filtered = filtered.filter((d) => {
          if (!d.opening_hours_json) return false;
          return isOpenNow(
            d.opening_hours_json,
            d.city,
            d.timezone_id ?? undefined,
            d.utc_offset ?? undefined
          );
        });
      }

      // Sort by sortBy preference
      if (sortBy === "recent") {
        filtered.sort((a, b) => {
          const dateA = a.id || 0;
          const dateB = b.id || 0;
          return dateB - dateA;
        });
      }

      return filtered;
    },
    [destinations, advancedFilters, selectedCity, selectedCategory, user, visitedSlugs, sortBy]
  );

  // Filter destinations
  const filterDestinations = useCallback(() => {
    const filtered = filterDestinationsWithData(destinations);
    setFilteredDestinations(filtered);
  }, [destinations, filterDestinationsWithData]);

  // Track destination click
  const trackDestinationEngagement = useCallback(
    (
      destination: Destination,
      source: "grid" | "map_marker" | "map_list",
      position?: number
    ) => {
      trackDestinationClick({
        destinationSlug: destination.slug,
        position: typeof position === "number" ? position : undefined,
        source,
      });

      if (destination.id && user?.id) {
        fetch("/api/discovery/track-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            eventType: "click",
            documentId: destination.slug,
          }),
        }).catch(() => {});
      }
    },
    [user?.id]
  );

  const handleDestinationSelect = useCallback((destination: Destination, index?: number) => {
    openIntelligentDrawer(destination);
    openDrawer("destination");
    trackDestinationEngagement(
      destination,
      "grid",
      (currentPage - 1) * itemsPerPage + (index || 0)
    );
  }, [openIntelligentDrawer, openDrawer, trackDestinationEngagement, currentPage, itemsPerPage]);

  // Perform AI search
  const performAISearch = useCallback(
    async (query: string) => {
      if (!query.trim() || searching) return;

      setSearching(true);
      setSubmittedQuery(query);
      lastSearchedQueryRef.current = query;

      // Add user message to chat
      setChatMessages((prev) => [...prev, { type: "user", content: query }]);

      try {
        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query,
            conversationHistory,
            userId: user?.id,
          }),
        });

        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();

        // Update conversation history
        setConversationHistory((prev) => [
          ...prev,
          { role: "user", content: query },
          { role: "assistant", content: data.content || "" },
        ]);

        // Add assistant response
        setChatMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: data.content || "Here are some recommendations:",
          },
        ]);

        setChatResponse(data.content || "");

        // Update destinations from search results
        if (data.destinations && Array.isArray(data.destinations)) {
          setFilteredDestinations(data.destinations);
        }

        // Update intent and suggestions
        if (data.intent) {
          setSearchIntent(data.intent);
        }
        if (data.suggestions) {
          setFollowUpSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error("Search error:", error);
        setChatMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setSearching(false);
      }
    },
    [searching, conversationHistory, user?.id]
  );

  // Create trip handler
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setCreatingTrip(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: "New Trip",
          status: "planning",
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error("Error creating trip:", err);
    } finally {
      setCreatingTrip(false);
    }
  }, [user, router]);

  // Location change handler for Near Me
  const handleLocationChange = async (
    lat: number | null,
    lng: number | null,
    radius: number
  ) => {
    if (!lat || !lng) {
      setUserLocation(null);
      setNearbyDestinations([]);
      return;
    }

    setUserLocation({ lat, lng });

    try {
      const response = await fetch(
        `/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`
      );
      const data = await response.json();

      if (data.destinations) {
        setNearbyDestinations(data.destinations);
      } else {
        setNearbyDestinations([]);
      }
    } catch (error) {
      console.error("Error fetching nearby destinations:", error);
      setNearbyDestinations([]);
    }
  };

  // Toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    if (!isAdmin || !canUseEditMode) return;
    toggleEditMode();
  }, [canUseEditMode, isAdmin, toggleEditMode]);

  // Effects

  // Initialize tracking on mount
  useEffect(() => {
    initializeSession();
    trackPageView({ pageType: "home" });
  }, []);

  // Fetch initial data client-side (when page is static)
  useEffect(() => {
    if (initialDestinations.length > 0) return; // Already have server data

    const fetchInitialData = async () => {
      try {
        // Fetch destinations and filters in parallel
        const [destRes, filterRes] = await Promise.all([
          fetch("/api/homepage/destinations?limit=20"),
          fetch("/api/homepage/filters"),
        ]);

        const [destData, filterData] = await Promise.all([
          destRes.json(),
          filterRes.json(),
        ]);

        if (destData.destinations) {
          setDestinations(destData.destinations);
          setFilteredDestinations(destData.destinations);
        }

        if (filterData.rows) {
          // Extract cities and categories from filter rows
          const citySet = new Set<string>();
          const categorySet = new Set<string>();
          for (const row of filterData.rows) {
            if (row.city) citySet.add(row.city);
            if (row.category) categorySet.add(row.category);
          }
          setCities(Array.from(citySet).sort());
          setCategories(Array.from(categorySet).sort());
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [initialDestinations.length]);

  // Handle view mode from URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "map") {
      setViewMode("map");
    } else if (viewParam === "grid") {
      setViewMode("grid");
    }
  }, []);

  // Search term effect
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const trimmedSearchTerm = searchTerm.trim();
      if (trimmedSearchTerm === lastSearchedQueryRef.current) return;
      if (searching) return;

      const timer = setTimeout(() => {
        if (!searching && searchTerm.trim() === trimmedSearchTerm) {
          performAISearch(searchTerm);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFilteredDestinations(destinations);
      setChatResponse("");
      setConversationHistory([]);
      setSearching(false);
      setSubmittedQuery("");
      setChatMessages([]);
      setFollowUpSuggestions([]);
      lastSearchedQueryRef.current = "";
      setCurrentPage(1);
    }
  }, [searchTerm, searching, performAISearch, destinations]);

  // Filter effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      filterDestinations();
    }
  }, [selectedCity, selectedCategory, advancedFilters, sortBy, filterDestinations, searchTerm]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch user-specific data on client (non-blocking SSR)
  useEffect(() => {
    if (!user) return;

    // Set admin status
    const role = user.app_metadata?.role;
    setIsAdmin(role === "admin");

    // Fetch user profile
    fetch("/api/homepage/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setUserProfile(data.profile);
          setUserContext({
            favoriteCities: data.profile.favorite_cities || [],
            favoriteCategories: data.profile.favorite_categories || [],
            travelStyle: data.profile.travel_style,
          });
        }
      })
      .catch(() => {});

    // Fetch visited places
    fetch("/api/homepage/visited", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.slugs) {
          setVisitedSlugs(new Set(data.slugs));
        }
      })
      .catch(() => {});

    // Fetch last session (low priority)
    fetch(`/api/conversation/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session_id && data?.messages?.length > 0) {
          setLastSession({
            id: data.session_id,
            last_activity: data.last_activity || new Date().toISOString(),
            context_summary: data.context,
          });
          const lastActivity = new Date(data.last_activity || Date.now());
          const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            setShowSessionResume(true);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  // Computed values
  const featuredCities = useMemo(
    () => FEATURED_CITIES.filter((city) => cities.includes(city)),
    [cities]
  );
  const remainingCities = useMemo(
    () => cities.filter((city) => !FEATURED_CITIES.includes(city)),
    [cities]
  );
  const displayedCities = showAllCities
    ? [...featuredCities, ...remainingCities]
    : featuredCities;

  const displayDestinations =
    advancedFilters.nearMe && nearbyDestinations.length > 0
      ? nearbyDestinations
      : filteredDestinations;
  const totalPages = Math.ceil(displayDestinations.length / itemsPerPage);

  return (
    <ErrorBoundary>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.urbanmanual.co/#organization",
                name: "The Urban Manual",
                url: "https://www.urbanmanual.co",
                description:
                  "Curated guide to world's best hotels, restaurants & travel destinations",
              },
              {
                "@type": "WebSite",
                "@id": "https://www.urbanmanual.co/#website",
                url: "https://www.urbanmanual.co",
                name: "The Urban Manual",
                publisher: { "@id": "https://www.urbanmanual.co/#organization" },
              },
            ],
          }),
        }}
      />

      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        <h1 className="sr-only">
          Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
        </h1>

        {/* Hero Section */}
        <section className="min-h-[50vh] flex flex-col px-6 md:px-10 py-10 pb-6 md:pb-10">
          <div className="w-full flex md:justify-start flex-1 items-center">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  {!submittedQuery && (
                    <>
                      {showSessionResume && lastSession && (
                        <div className="mb-6">
                          <SessionResume
                            session={lastSession}
                            onResume={() => setShowSessionResume(false)}
                            onDismiss={() => setShowSessionResume(false)}
                          />
                        </div>
                      )}

                      {userContext && user && !searchTerm && (
                        <div className="mb-6">
                          <ContextCards context={userContext} />
                        </div>
                      )}

                      <GreetingHero
                        searchQuery={searchTerm}
                        onSearchChange={(value) => {
                          setSearchTerm(value);
                          if (!value.trim()) {
                            setConversationHistory([]);
                            setSearchIntent(null);
                            setSeasonalContext(null);
                            setChatResponse("");
                            setFilteredDestinations(destinations);
                            setSubmittedQuery("");
                          }
                        }}
                        onSubmit={(query) => {
                          if (query.trim() && !searching) {
                            performAISearch(query);
                          }
                        }}
                        userName={
                          user?.user_metadata?.name ||
                          user?.email?.split("@")[0]
                        }
                        userProfile={userProfile}
                        lastSession={lastSession}
                        enrichedContext={enrichedGreetingContext}
                        isAIEnabled={true}
                        isSearching={searching}
                        availableCities={cities}
                        availableCategories={categories}
                      />
                    </>
                  )}

                  {/* Chat display when search is active */}
                  {submittedQuery && (
                    <div className="w-full">
                      <div
                        ref={chatContainerRef}
                        className="max-h-[400px] overflow-y-auto space-y-6 mb-6 scrollbar-thin"
                      >
                        {chatMessages.map((message, index) => (
                          <div key={index} className="space-y-2">
                            {message.type === "user" ? (
                              <div className="text-left text-xs uppercase tracking-[2px] font-medium text-black dark:text-white">
                                {message.content}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <MarkdownRenderer
                                  content={message.content}
                                  className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                                />
                                {index === chatMessages.length - 1 &&
                                  followUpSuggestions.length > 0 && (
                                    <FollowUpSuggestions
                                      legacySuggestions={followUpSuggestions}
                                      onSuggestionClick={(suggestion) => {
                                        setSearchTerm(suggestion);
                                        setFollowUpInput("");
                                      }}
                                      isLoading={searching}
                                    />
                                  )}
                              </div>
                            )}
                          </div>
                        ))}

                        {(searching || (submittedQuery && chatMessages.length === 0)) && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                            <span>{currentLoadingText}</span>
                          </div>
                        )}
                      </div>

                      {!searching && chatMessages.length > 0 && (
                        <input
                          placeholder="Refine your search or ask a follow-up..."
                          value={followUpInput}
                          onChange={(e) => setFollowUpInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && followUpInput.trim()) {
                              e.preventDefault();
                              setSearchTerm(followUpInput.trim());
                              setFollowUpInput("");
                              performAISearch(followUpInput.trim());
                            }
                          }}
                          className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white"
                        />
                      )}

                      {searchIntent && !searching && (
                        <div className="mt-4">
                          <IntentConfirmationChips intent={searchIntent} editable={false} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* City and Category filters */}
              {!submittedQuery && (
                <div className="flex-1 flex items-end">
                  <div className="w-full pt-6">
                    <div className="mb-[50px]">
                      <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCity("");
                            setCurrentPage(1);
                            trackFilterChange({ filterType: "city", value: "all" });
                          }}
                          className={`transition-all duration-200 ease-out ${
                            !selectedCity
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
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
                              trackFilterChange({ filterType: "city", value: newCity || "all" });
                            }}
                            className={`transition-all duration-200 ease-out ${
                              selectedCity === city
                                ? "font-medium text-black dark:text-white"
                                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                            }`}
                          >
                            {capitalizeCity(city)}
                          </button>
                        ))}
                      </div>

                      {cities.length > displayedCities.length && !showAllCities && (
                        <button
                          onClick={() => setShowAllCities(true)}
                          className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                        >
                          + More cities ({cities.length - displayedCities.length})
                        </button>
                      )}
                      {showAllCities && (
                        <button
                          onClick={() => setShowAllCities(false)}
                          className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                        >
                          Show less
                        </button>
                      )}
                    </div>

                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setAdvancedFilters((prev) => ({
                              ...prev,
                              category: undefined,
                              michelin: undefined,
                            }));
                            setCurrentPage(1);
                          }}
                          className={`transition-all duration-200 ease-out ${
                            !selectedCategory && !advancedFilters.michelin
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                          }`}
                        >
                          All Categories
                        </button>
                        <button
                          onClick={() => {
                            const newValue = !advancedFilters.michelin;
                            setSelectedCategory("");
                            setAdvancedFilters((prev) => ({
                              ...prev,
                              category: undefined,
                              michelin: newValue || undefined,
                            }));
                            setCurrentPage(1);
                          }}
                          className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                            advancedFilters.michelin
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                          }`}
                        >
                          <Image
                            src="/michelin-star.svg"
                            alt="Michelin star"
                            width={12}
                            height={12}
                            className="h-3 w-3"
                          />
                          Michelin
                        </button>
                        {categories
                          .slice()
                          .sort((a, b) => {
                            if (a.toLowerCase() === "others") return 1;
                            if (b.toLowerCase() === "others") return -1;
                            return 0;
                          })
                          .map((category) => {
                            const IconComponent = getCategoryIcon(category);
                            return (
                              <button
                                key={category}
                                onClick={() => {
                                  const newCategory =
                                    category === selectedCategory ? "" : category;
                                  setSelectedCategory(newCategory);
                                  setAdvancedFilters((prev) => ({
                                    ...prev,
                                    category: newCategory || undefined,
                                    michelin: undefined,
                                  }));
                                  setCurrentPage(1);
                                }}
                                className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                                  selectedCategory === category && !advancedFilters.michelin
                                    ? "font-medium text-black dark:text-white"
                                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
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

        {/* Edit Mode Banner */}
        {editModeActive && (
          <div className="sticky top-0 z-40 w-full px-6 md:px-10 mb-4">
            <div className="max-w-[1800px] mx-auto">
              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-gray-100 animate-pulse" />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    Edit mode
                  </p>
                </div>
                <button
                  onClick={() => disableEditMode()}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Edit Toggle */}
        {isAdmin && (
          <div className="w-full px-6 md:px-10">
            <div className="max-w-[1800px] mx-auto mb-6 flex justify-end">
              <EditModeToggle active={editModeActive} onToggle={handleToggleEditMode} />
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="w-full px-6 md:px-10 mt-8">
          <div className="max-w-[1800px] mx-auto">
            {/* Navigation Row */}
            <div className="mb-6">
              <div className="flex justify-start sm:justify-end">
                <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 no-scrollbar sm:justify-end sm:overflow-visible">
                  <button
                    onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)]"
                  >
                    {viewMode === "grid" ? (
                      <>
                        <Map className="h-4 w-4" />
                        <span className="hidden sm:inline">Map</span>
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Grid</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCreateTrip}
                    disabled={creatingTrip}
                    className="flex h-[34px] flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-2 py-2 text-sm font-medium text-white dark:bg-white dark:text-black disabled:opacity-50"
                  >
                    {creatingTrip ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {creatingTrip ? "Creating..." : "Create Trip"}
                    </span>
                  </button>

                  <SearchFiltersComponent
                    filters={advancedFilters}
                    onFiltersChange={(newFilters) => {
                      setAdvancedFilters(newFilters);
                      if (newFilters.city !== undefined) {
                        setSelectedCity(newFilters.city || "");
                      }
                      if (newFilters.category !== undefined) {
                        setSelectedCategory(newFilters.category || "");
                      }
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
                    fullWidthPanel={true}
                    useFunnelIcon={true}
                  />

                  <Link
                    href="/cities"
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.10)] dark:text-[rgba(255,255,255,0.92)]"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Discover by Cities</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            {user && !submittedQuery && !selectedCity && !selectedCategory && (
              <div className="mb-12 md:mb-16">
                <SmartRecommendations
                  onCardClick={(destination) => {
                    openIntelligentDrawer(destination);
                    openDrawer("destination");
                    trackDestinationEngagement(destination, "grid", 0);
                  }}
                />
              </div>
            )}

            {/* Sequence Predictions */}
            {user &&
              predictions?.predictions &&
              predictions.predictions.length > 0 &&
              !submittedQuery && (
                <div className="mb-8">
                  <SequencePredictionsInline
                    predictions={predictions.predictions}
                    compact={false}
                  />
                </div>
              )}

            {/* Trending Section */}
            {!submittedQuery && (
              <div className="mb-12 md:mb-16">
                <TrendingSectionML limit={12} forecastDays={7} />
              </div>
            )}

            {/* Grid / Map View */}
            {isInitialLoading ? (
              <DestinationGridSkeleton count={20} />
            ) : displayDestinations.length === 0 && !advancedFilters.nearMe ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searching ? "Searching..." : "No destinations found."}
                </p>
              </div>
            ) : viewMode === "map" ? (
              <div className="relative w-full h-[calc(100vh-20rem)] min-h-[500px] rounded-lg border border-gray-200 dark:border-gray-800">
                <HomeMapSplitView
                  destinations={displayDestinations}
                  selectedDestination={null}
                  onMarkerSelect={(destination) => {
                    openIntelligentDrawer(destination);
                    trackDestinationEngagement(destination, "map_marker");
                  }}
                  onListItemSelect={(destination) => {
                    openIntelligentDrawer(destination);
                    trackDestinationEngagement(destination, "map_list");
                  }}
                  onCloseDetail={() => {/* IntelligentDrawer handles close */}}
                  isLoading={isDestinationsLoading}
                />
              </div>
            ) : (
              <>
                {/* Destination Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                  {displayDestinations
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((destination, index) => (
                      <DestinationCard
                        key={destination.slug}
                        destination={destination}
                        index={index}
                        isVisited={visitedSlugs.has(destination.slug)}
                        onSelect={handleDestinationSelect}
                      />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <ScrollToTop />
      </main>

      {/* Destination Drawer - now handled by IntelligentDrawer in layout.tsx */}
    </ErrorBoundary>
  );
}
