'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, MapPin, ArrowRight, RefreshCw, Search, Bookmark, CheckCircle, Map } from 'lucide-react';
import { capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';
import { Destination } from '@/types/destination';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import AddToTripButton from '@/features/trip/components/AddToTripButton';

// Deterministic UI types from travel-intelligence API
interface SearchFilters {
  city?: string | null;
  category?: string | null;
  neighborhood?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  michelin?: boolean;
  occasion?: string | null;
  vibe?: string[];
  openNow?: boolean;
}

interface ContextChip {
  key: string;
  label: string;
  removable?: boolean;
  patch?: Partial<SearchFilters>;
}

interface RefinementChip {
  label: string;
  patch: Partial<SearchFilters>;
  kind: 'vibe' | 'price' | 'neighborhood' | 'category' | 'city' | 'misc';
}

interface QuestionCard {
  prompt: string;
  options: Array<{
    label: string;
    patch: Partial<SearchFilters>;
  }>;
}

interface DeterministicUI {
  contextChips: ContextChip[];
  refinements: RefinementChip[];
  question?: QuestionCard;
  whyBySlug?: Record<string, string[]>;
}

// ActionPatch type from travel-intelligence API for follow-up suggestions
interface ActionPatch {
  label: string;
  patch: {
    filters?: Partial<SearchFilters>;
    query?: {
      set?: string;
      append?: string;
      clear?: boolean;
    };
    intent?: {
      mode?: string;
      referenceSlug?: string;
      itineraryDuration?: string;
      socialContext?: string;
    };
    clearFilters?: boolean;
    reset?: boolean;
  };
  reason: {
    type: string;
    text?: string;
  };
  icon?: string;
  priority?: number;
}

// Union type for follow-up suggestions (can be string or ActionPatch)
type FollowUpSuggestion = string | ActionPatch;

// Instant search result type
interface InstantResult {
  type: 'destination' | 'saved' | 'visited' | 'trip' | 'suggestion';
  id: string | number;
  name: string;
  subtitle: string;
  city?: string;
  category?: string;
  slug?: string;
  image?: string;
  score?: number;
  tripId?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// AI-style rotating placeholders
const AI_PLACEHOLDERS = [
  'Ask me anything about travel...',
  'Where would you like to go?',
  'Find restaurants, hotels, or hidden gems...',
  'Try: "best cafes in Tokyo"',
  'Try: "romantic dinner in Paris"',
  'Try: "budget hotels near me"',
];

// Helper to safely normalize follow-up suggestions from API
// Handles both string[] and ActionPatch[] formats, filtering out invalid entries
const normalizeFollowUps = (followUps: unknown): FollowUpSuggestion[] => {
  if (!Array.isArray(followUps)) return [];

  return followUps.filter((item): item is FollowUpSuggestion => {
    // Valid string
    if (typeof item === 'string' && item.trim().length > 0) {
      return true;
    }
    // Valid ActionPatch object (must have label string)
    if (
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      typeof (item as ActionPatch).label === 'string' &&
      (item as ActionPatch).label.trim().length > 0
    ) {
      return true;
    }
    // Invalid entry - log for debugging and filter out
    console.warn('[InteractiveHero] Invalid follow-up suggestion filtered out:', item);
    return false;
  });
};

// Follow-up suggestions based on context
const generateFollowUps = (
  query: string,
  destinations: Destination[],
  filters?: { city?: string | null; category?: string | null }
): string[] => {
  const suggestions: string[] = [];
  const city = filters?.city;
  const category = filters?.category;

  // City-specific follow-ups
  if (city) {
    if (category === 'restaurant') {
      suggestions.push(`Best bars in ${city}`);
      suggestions.push(`Cafes in ${city}`);
    } else if (category === 'hotel') {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Things to do in ${city}`);
    } else if (category === 'bar') {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Late night spots in ${city}`);
    } else {
      suggestions.push(`Restaurants in ${city}`);
      suggestions.push(`Hotels in ${city}`);
    }
  }

  // Category-specific without city
  if (!city && category) {
    suggestions.push(`${category}s in Tokyo`);
    suggestions.push(`${category}s in Taipei`);
    suggestions.push(`Best ${category}s in New York`);
  }

  // If we have Michelin results, suggest more premium options
  if (destinations.some(d => d.michelin_stars && d.michelin_stars > 0)) {
    suggestions.push('Show me more Michelin starred');
  }

  // Generic fallbacks
  if (suggestions.length < 3) {
    if (city) {
      suggestions.push(`More in ${city}`);
    }
    suggestions.push('Restaurants in Paris');
    suggestions.push('Hotels in London');
  }

  return suggestions.slice(0, 3);
};

/**
 * Interactive Hero Component - Apple Design System
 *
 * Clean, minimal hero with search and inline AI chat.
 * Uses SF Pro-inspired typography and Apple's spacious layout principles.
 */
export default function InteractiveHero() {
  const { user } = useAuth();
  const {
    destinations,
    isLoading,
    selectedCity,
    selectedCategory,
    searchTerm,
    setSelectedCity,
    setSelectedCategory,
    setSearchTerm,
    filteredDestinations,
    openDestination,
    michelinOnly,
    setMichelinOnly,
  } = useHomepageData();

  const router = useRouter();
  const { startTrip, addToTrip, activeTrip } = useTripBuilder();
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Instant search state
  const [instantResults, setInstantResults] = useState<InstantResult[]>([]);
  const [instantSuggestions, setInstantSuggestions] = useState<string[]>([]);
  const [isLoadingInstant, setIsLoadingInstant] = useState(false);
  const [showInstantResults, setShowInstantResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(localSearchTerm, 150);

  // Inline chat state
  const [chatResponse, setChatResponse] = useState('');
  const [chatDestinations, setChatDestinations] = useState<Destination[]>([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [showChatResults, setShowChatResults] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [lastFilters, setLastFilters] = useState<{ city?: string | null; category?: string | null }>({});
  const [itinerary, setItinerary] = useState<Array<{ timeSlot: string; label: string; destination?: Destination }>>([]);
  const [isItinerary, setIsItinerary] = useState(false);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [deterministicUI, setDeterministicUI] = useState<DeterministicUI | null>(null);
  const [activeFilters, setActiveFilters] = useState<Partial<SearchFilters>>({});

  // Close chat results but keep grid filters
  const handleCloseChatResults = useCallback((resetFilters = false) => {
    setShowChatResults(false);
    setChatResponse('');
    setChatDestinations([]);
    setFollowUpSuggestions([]);
    setConversationHistory([]);
    setLastQuery('');
    setItinerary([]);
    setIsItinerary(false);
    setNeedsClarification(false);
    setDeterministicUI(null);
    setActiveFilters({});

    // Optionally reset grid filters
    if (resetFilters) {
      setSelectedCity('');
      setSelectedCategory('');
      setLastFilters({});
    }
  }, [setSelectedCity, setSelectedCategory]);

  // Rotate placeholders when input is empty and not focused
  useEffect(() => {
    if (localSearchTerm.trim() || isFocused || showChatResults) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [localSearchTerm, isFocused, showChatResults]);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Press Escape to close chat results (keep filters)
      if (e.key === 'Escape' && showChatResults) {
        handleCloseChatResults(false);
      }
      // Press Escape to close instant results
      if (e.key === 'Escape' && showInstantResults) {
        setShowInstantResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showChatResults, showInstantResults, handleCloseChatResults]);

  // Instant search effect - fetch as user types
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || showChatResults) {
      setInstantResults([]);
      setInstantSuggestions([]);
      setShowInstantResults(false);
      return;
    }

    const fetchInstantResults = async () => {
      setIsLoadingInstant(true);
      try {
        const response = await fetch(`/api/search/instant?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setInstantResults(data.results || []);
          setInstantSuggestions(data.suggestions || []);
          setShowInstantResults(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Instant search error:', error);
      } finally {
        setIsLoadingInstant(false);
      }
    };

    fetchInstantResults();
  }, [debouncedQuery, showChatResults]);

  // Handle clicking outside to close instant results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowInstantResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation in instant results
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showInstantResults || instantResults.length === 0) return;

    const totalItems = instantResults.length + instantSuggestions.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (selectedIndex < instantResults.length) {
        handleInstantResultClick(instantResults[selectedIndex]);
      } else {
        const suggestionIndex = selectedIndex - instantResults.length;
        setLocalSearchTerm(instantSuggestions[suggestionIndex]);
        handleSearch(undefined, instantSuggestions[suggestionIndex]);
      }
    }
  }, [showInstantResults, instantResults, instantSuggestions, selectedIndex]);

  // Handle clicking an instant result
  const handleInstantResultClick = useCallback((result: InstantResult) => {
    setShowInstantResults(false);
    setLocalSearchTerm('');

    if (result.type === 'trip' && result.tripId) {
      router.push(`/trips/${result.tripId}`);
    } else if (result.slug) {
      // Open destination drawer
      const dest = destinations.find(d => d.slug === result.slug);
      if (dest) {
        openDestination(dest);
      } else {
        // Navigate to destination page if not in current data
        router.push(`/destination/${result.slug}`);
      }
    }
  }, [router, destinations, openDestination]);

  // Get icon for instant result type
  const getResultIcon = (type: InstantResult['type']) => {
    switch (type) {
      case 'saved':
        return <Bookmark className="w-3.5 h-3.5 text-amber-500" />;
      case 'visited':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'trip':
        return <Map className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Search className="w-3.5 h-3.5 text-[var(--editorial-text-tertiary)]" />;
    }
  };

  // Get user's first name for greeting
  const userName = user?.user_metadata?.name?.split(' ')[0] ||
                   user?.email?.split('@')[0];


  // Handle AI search with optional filter patch
  const handleSearch = useCallback(async (e?: React.FormEvent, queryOverride?: string, filterPatch?: Partial<SearchFilters>) => {
    if (e) e.preventDefault();
    const query = queryOverride || localSearchTerm.trim();
    if (!query) return;

    // Merge filter patch with active filters
    const newFilters = filterPatch
      ? { ...activeFilters, ...filterPatch }
      : activeFilters;

    // Close instant results and start full AI search
    setShowInstantResults(false);
    setIsSearching(true);
    setShowChatResults(true);
    setLastQuery(query);
    setChatResponse('');
    setChatDestinations([]);
    setFollowUpSuggestions([]);
    setItinerary([]);
    setIsItinerary(false);
    setNeedsClarification(false);
    setDeterministicUI(null);

    try {
      // Use the new Travel Intelligence endpoint with filters
      const response = await fetch('/api/travel-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationHistory,
          filters: Object.keys(newFilters).length > 0 ? newFilters : undefined,
          limit: 20,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      setChatResponse(data.response || 'Here are some results:');
      setChatDestinations(data.destinations || []);

      // Handle clarification requests
      if (data.needsClarification) {
        setNeedsClarification(true);
        // Store deterministic UI for clarification questions
        if (data.ui) {
          setDeterministicUI(data.ui);
        }
        // Follow-ups are city suggestions for clarification (normalized to handle ActionPatch objects)
        setFollowUpSuggestions(normalizeFollowUps(data.followUps));
        setLocalSearchTerm('');
        return;
      }

      // Handle itinerary response
      if (data.itinerary && data.itinerary.length > 0) {
        setItinerary(data.itinerary);
        setIsItinerary(true);

        // Populate the trip builder with itinerary items
        const city = data.filters?.city || '';
        if (city && !activeTrip) {
          startTrip(city, 1);
        }
        // Add each destination to the trip
        data.itinerary.forEach((slot: { destination?: Destination; timeSlot?: string }) => {
          if (slot.destination) {
            addToTrip(slot.destination, 1, slot.timeSlot);
          }
        });
      }

      // Store filters for contextual follow-ups
      const filters = data.filters || {};
      setLastFilters(filters);

      // Sync AI search filters with the grid
      // This makes the grid show related results
      if (filters.city) {
        setSelectedCity(filters.city);
      }
      if (filters.category) {
        setSelectedCategory(filters.category);
      }
      if (filters.michelin) {
        setMichelinOnly(true);
      }

      // Store deterministic UI
      if (data.ui) {
        setDeterministicUI(data.ui);
      }

      // Store active filters for refinement
      setActiveFilters(newFilters);

      // Use follow-ups from API (intelligent suggestions, normalized to handle ActionPatch objects)
      const apiFollowUps = normalizeFollowUps(data.followUps);
      setFollowUpSuggestions(apiFollowUps.length > 0 ? apiFollowUps : generateFollowUps(query, data.destinations || [], filters));

      // Update conversation history for context
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: query },
        { role: 'assistant', content: data.response || '' },
      ]);

      // Clear input after successful search
      setLocalSearchTerm('');
    } catch (error) {
      console.error('AI search error:', error);
      setChatResponse('Sorry, I had trouble searching. Please try again.');
      setFollowUpSuggestions(['Restaurants in Tokyo', 'Hotels in Paris', 'Plan my day in Tokyo']);
    } finally {
      setIsSearching(false);
    }
  }, [localSearchTerm, conversationHistory, setSelectedCity, setSelectedCategory, setMichelinOnly, activeTrip, startTrip, addToTrip, activeFilters]);

  // Handle follow-up suggestion click
  const handleFollowUp = useCallback((suggestion: FollowUpSuggestion) => {
    if (typeof suggestion === 'string') {
      // Legacy string format
      setLocalSearchTerm(suggestion);
      handleSearch(undefined, suggestion);
    } else {
      // ActionPatch object format from API
      const label = suggestion.label;
      const filterPatch = suggestion.patch?.filters;

      // If there's a query set, use it as the search query
      if (suggestion.patch?.query?.set) {
        setLocalSearchTerm(suggestion.patch.query.set);
        handleSearch(undefined, suggestion.patch.query.set, filterPatch);
      } else {
        // Otherwise use the label as the query with the filter patch
        setLocalSearchTerm(label);
        handleSearch(undefined, label, filterPatch);
      }
    }
  }, [handleSearch]);

  // Handle context chip removal (re-run search without that filter)
  const handleRemoveContextChip = useCallback((patch: Partial<SearchFilters>) => {
    // Clean null values to undefined for merging
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).map(([k, v]) => [k, v === null ? undefined : v])
    ) as Partial<SearchFilters>;
    handleSearch(undefined, lastQuery, cleanPatch);
  }, [handleSearch, lastQuery]);

  // Handle refinement chip click (apply filter patch)
  const handleRefinementClick = useCallback((patch: Partial<SearchFilters>) => {
    handleSearch(undefined, lastQuery, patch);
  }, [handleSearch, lastQuery]);

  // Handle question option click
  const handleQuestionOptionClick = useCallback((patch: Partial<SearchFilters>) => {
    handleSearch(undefined, lastQuery, patch);
  }, [handleSearch, lastQuery]);


  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destinationCount = destinations.length || '800';
  const filteredCount = filteredDestinations.length;


  return (
    <div className="w-full">
      {/* Centered Hero Layout */}
      <div className="flex flex-col items-center text-center">

        {/* Editorial Text - Centered */}
        <div className="flex flex-col items-center max-w-2xl mx-auto">
          {/* Small Caps Label */}
          <p className="text-xs uppercase tracking-widest text-[var(--editorial-text-tertiary)] mb-6">
            Curated Travel Guide
          </p>

          {/* Main Headline - Large Serif */}
          <h2
            className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.05] font-normal tracking-[-0.02em] text-[var(--editorial-text-primary)] mb-6"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            {userName ? `${getGreeting()}, ${userName}` : 'Discover the world\'s finest'}
          </h2>

          {/* Subheadline */}
          <p
            className="text-sm md:text-base text-[var(--editorial-text-secondary)] mb-10 leading-relaxed max-w-md"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            {destinationCount}+ handpicked hotels, restaurants, and destinations across the globe.
          </p>

          {/* Search Input - Minimal Editorial Style */}
          <form onSubmit={handleSearch} className="mb-0 w-full max-w-lg">
            <div className="relative">
              {/* AI indicator - Animated thinking/loading */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10">
                {isSearching || isLoadingInstant ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${isFocused || showChatResults ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`} />
                ) : (
                  <Search className={`w-4 h-4 transition-colors duration-200 ${isFocused || showChatResults ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`} />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                onKeyDown={handleInputKeyDown}
                placeholder={showChatResults ? 'Ask a follow-up question...' : AI_PLACEHOLDERS[placeholderIndex]}
                className="w-full h-12 pl-11 pr-14 text-sm bg-[var(--editorial-bg-elevated)] rounded-lg
                           border border-[var(--editorial-border)] text-[var(--editorial-text-primary)]
                           placeholder:text-[var(--editorial-text-tertiary)]
                           focus:outline-none focus:border-[var(--editorial-text-primary)]
                           transition-all duration-200"
              />
              <button
                type="submit"
                disabled={isSearching || !localSearchTerm.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                           rounded-md bg-[var(--editorial-text-primary)]
                           text-[var(--editorial-bg)]
                           hover:opacity-90
                           active:opacity-80
                           disabled:opacity-50 transition-all duration-200 z-10"
                aria-label="Search"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              {/* Instant Search Dropdown */}
              {showInstantResults && !showChatResults && (instantResults.length > 0 || instantSuggestions.length > 0) && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-[var(--editorial-bg-elevated)]
                             rounded-lg shadow-xl border border-[var(--editorial-border)]
                             max-h-[400px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {/* Results */}
                  {instantResults.length > 0 && (
                    <div className="p-2">
                      {/* Group results by type */}
                      {instantResults.filter(r => r.type === 'saved' || r.type === 'visited').length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-xs font-medium text-[var(--editorial-text-tertiary)] uppercase tracking-wider">
                            Your Places
                          </p>
                          {instantResults
                            .filter(r => r.type === 'saved' || r.type === 'visited')
                            .map((result, idx) => {
                              const actualIndex = instantResults.findIndex(r => r.id === result.id && r.type === result.type);
                              return (
                                <button
                                  key={`${result.type}-${result.id}`}
                                  onClick={() => handleInstantResultClick(result)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left
                                             transition-colors ${selectedIndex === actualIndex
                                               ? 'bg-[var(--editorial-border)]'
                                               : 'hover:bg-[var(--editorial-border-subtle)]'}`}
                                >
                                  {result.image ? (
                                    <div className="w-10 h-10 overflow-hidden flex-shrink-0 bg-[var(--editorial-border)]">
                                      <Image
                                        src={result.image}
                                        alt={result.name}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center flex-shrink-0">
                                      {getResultIcon(result.type)}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">
                                      {result.name}
                                    </p>
                                    <p className="text-xs text-[var(--editorial-text-secondary)] truncate flex items-center gap-1.5">
                                      {getResultIcon(result.type)}
                                      {result.subtitle}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Trips */}
                      {instantResults.filter(r => r.type === 'trip').length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-xs font-medium text-[var(--editorial-text-tertiary)] uppercase tracking-wider">
                            Your Trips
                          </p>
                          {instantResults
                            .filter(r => r.type === 'trip')
                            .map((result) => {
                              const actualIndex = instantResults.findIndex(r => r.id === result.id && r.type === result.type);
                              return (
                                <button
                                  key={`trip-${result.id}`}
                                  onClick={() => handleInstantResultClick(result)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                             transition-colors ${selectedIndex === actualIndex
                                               ? 'bg-[var(--editorial-border)]'
                                               : 'hover:bg-[var(--editorial-border-subtle)]'}`}
                                >
                                  <div className="w-10 h-10 rounded-lg bg-[var(--editorial-accent)]/10 flex items-center justify-center flex-shrink-0">
                                    <Map className="w-5 h-5 text-blue-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">
                                      {result.name}
                                    </p>
                                    <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
                                      {result.subtitle}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Search Results */}
                      {instantResults.filter(r => r.type === 'destination').length > 0 && (
                        <div>
                          <p className="px-3 py-1 text-xs font-medium text-[var(--editorial-text-tertiary)] uppercase tracking-wider">
                            Results
                          </p>
                          {instantResults
                            .filter(r => r.type === 'destination')
                            .map((result) => {
                              const actualIndex = instantResults.findIndex(r => r.id === result.id && r.type === result.type);
                              return (
                                <button
                                  key={`dest-${result.id}`}
                                  onClick={() => handleInstantResultClick(result)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                             transition-colors ${selectedIndex === actualIndex
                                               ? 'bg-[var(--editorial-border)]'
                                               : 'hover:bg-[var(--editorial-border-subtle)]'}`}
                                >
                                  {result.image ? (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--editorial-border)]">
                                      <Image
                                        src={result.image}
                                        alt={result.name}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center flex-shrink-0">
                                      <MapPin className="w-5 h-5 text-[var(--editorial-text-tertiary)]" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">
                                      {result.name}
                                    </p>
                                    <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
                                      {result.subtitle}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {instantSuggestions.length > 0 && (
                    <div className="border-t border-[var(--editorial-border-subtle)] p-2">
                      <p className="px-3 py-1 text-xs font-medium text-[var(--editorial-text-tertiary)] uppercase tracking-wider">
                        Try searching for
                      </p>
                      {instantSuggestions.map((suggestion, idx) => {
                        const actualIndex = instantResults.length + idx;
                        return (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setLocalSearchTerm(suggestion);
                              handleSearch(undefined, suggestion);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                                       transition-colors ${selectedIndex === actualIndex
                                         ? 'bg-[var(--editorial-border)]'
                                         : 'hover:bg-[var(--editorial-border-subtle)]'}`}
                          >
                            <Sparkles className="w-4 h-4 text-[var(--editorial-text-tertiary)] flex-shrink-0" />
                            <span className="text-sm text-[var(--editorial-text-secondary)]">{suggestion}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoadingInstant && (
                    <div className="absolute top-2 right-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--editorial-text-tertiary)]" />
                    </div>
                  )}

                  {/* Press Enter hint */}
                  <div className="border-t border-[var(--editorial-border-subtle)] px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--editorial-text-tertiary)]">
                      Press Enter for full AI search
                    </span>
                    <span className="text-xs text-[var(--editorial-text-tertiary)]">
                      ↑↓ to navigate
                    </span>
                  </div>
                </div>
              )}
            </div>
            {!showChatResults && !showInstantResults && (
              <p className="mt-2 text-xs text-[var(--editorial-text-tertiary)]">
                Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/5 font-mono text-xs">/</kbd> to focus • Enter to search
              </p>
            )}
          </form>

          {/* Show All Button */}
          {!showChatResults && (
            <button
              onClick={() => {
                const grid = document.getElementById('destination-grid');
                if (grid) grid.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-6 px-6 py-3 text-sm font-medium
                         border border-[var(--editorial-text-primary)] text-[var(--editorial-text-primary)]
                         rounded-lg hover:bg-[var(--editorial-text-primary)] hover:text-[var(--editorial-bg)]
                         transition-all duration-200"
            >
              Show All Destinations
            </button>
          )}

          {/* AI Response */}
          {showChatResults && (
            <div className="mt-6 mb-8 w-full max-w-lg text-left animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Response header with close button */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-[var(--editorial-text-secondary)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Response for &quot;{lastQuery}&quot;</span>
                </div>
                <button
                  onClick={() => handleCloseChatResults(false)}
                  className="p-1 hover:bg-[var(--editorial-border)] rounded-full transition-colors"
                  aria-label="Close results"
                >
                  <X className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
                </button>
              </div>

              {chatResponse && (
                <p className="text-sm text-[var(--editorial-text-secondary)] mb-3 leading-relaxed">
                  {chatResponse}
                </p>
              )}

              {deterministicUI?.contextChips && deterministicUI.contextChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {deterministicUI.contextChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium
                                 bg-[var(--editorial-border)] text-[var(--editorial-text-secondary)] rounded-full"
                    >
                      {chip.label}
                      {chip.removable && chip.patch && (
                        <button
                          onClick={() => handleRemoveContextChip(chip.patch!)}
                          className="ml-0.5 p-0.5 hover:bg-[var(--editorial-border)] rounded-full transition-colors"
                          aria-label={`Remove ${chip.label} filter`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {deterministicUI?.question && (
                <div className="mb-4 p-3 rounded-xl bg-[var(--editorial-border-subtle)] border border-[var(--editorial-border-subtle)]">
                  <p className="text-sm font-medium text-[var(--editorial-text-primary)] mb-2">
                    {deterministicUI.question.prompt}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {deterministicUI.question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionOptionClick(option.patch)}
                        className="px-3 py-1.5 text-xs font-medium text-[var(--editorial-text-secondary)]
                                   bg-[var(--editorial-bg-elevated)] rounded-full border border-gray-200 dark:border-white/10
                                   hover:bg-gray-100 dark:hover:bg-white/20 hover:border-gray-300 dark:hover:border-white/20
                                   transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isItinerary && itinerary.length > 0 && (
                <div className="space-y-3 mb-4">
                  {itinerary.map((slot, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-24">
                        <span className="text-sm font-medium text-[var(--editorial-text-primary)]">
                          {slot.label}
                        </span>
                      </div>
                      {slot.destination && (
                        <button
                          onClick={() => openDestination(slot.destination as Destination)}
                          className="flex-1 flex items-center gap-3 p-2 rounded-xl bg-[var(--editorial-border-subtle)]
                                     hover:bg-[var(--editorial-border)] transition-colors text-left group"
                        >
                          {slot.destination.image_thumbnail || slot.destination.image ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--editorial-border)]">
                              <Image
                                src={slot.destination.image_thumbnail || slot.destination.image || ''}
                                alt={slot.destination.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">
                              {slot.destination.name}
                            </p>
                            <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
                              {capitalizeCategory(slot.destination.category)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] group-hover:text-gray-500 flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isItinerary && chatDestinations.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {chatDestinations.slice(0, 4).map((dest) => (
                    <div
                      key={dest.id || dest.slug}
                      className="relative flex items-center gap-3 p-2 rounded-xl bg-[var(--editorial-border-subtle)]
                                 hover:bg-[var(--editorial-border)] transition-colors group"
                    >
                      <button
                        onClick={() => openDestination(dest)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        {dest.image_thumbnail || dest.image ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--editorial-border)]">
                            <Image
                              src={dest.image_thumbnail || dest.image || ''}
                              alt={dest.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[var(--editorial-border)] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-[var(--editorial-text-tertiary)]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-text-secondary)]">
                            {dest.name}
                          </p>
                          <p className="text-xs text-[var(--editorial-text-secondary)] truncate">
                            {dest.city} • {capitalizeCategory(dest.category)}
                          </p>
                          {deterministicUI?.whyBySlug?.[dest.slug] && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {deterministicUI.whyBySlug[dest.slug].slice(0, 2).map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20
                                             text-amber-700 dark:text-amber-300 rounded"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AddToTripButton destination={dest} variant="icon" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(lastFilters.city || lastFilters.category) && filteredDestinations.length > 0 && (
                <button
                  onClick={() => handleCloseChatResults(false)}
                  className="text-sm font-medium text-[var(--editorial-text-primary)] mb-4 flex items-center gap-1.5 hover:underline"
                >
                  See all {filteredDestinations.length} results in grid
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {deterministicUI?.refinements && deterministicUI.refinements.length > 0 && !deterministicUI.question && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Refine results</p>
                  <div className="flex flex-wrap gap-1.5">
                    {deterministicUI.refinements.map((refinement, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRefinementClick(refinement.patch)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300
                                   bg-white dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10
                                   hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20
                                   transition-colors"
                      >
                        {refinement.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {followUpSuggestions.length > 0 && !deterministicUI?.question && (
                <div className="flex flex-wrap gap-2">
                  {followUpSuggestions.map((suggestion, index) => {
                    const label = typeof suggestion === 'string' ? suggestion : suggestion.label;
                    return (
                      <button
                        key={index}
                        onClick={() => handleFollowUp(suggestion)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300
                                   bg-[var(--editorial-border)] rounded-full
                                   hover:bg-[var(--editorial-border)] transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handleCloseChatResults(true)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500
                               hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Start over
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
