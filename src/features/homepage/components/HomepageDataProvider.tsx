'use client';

import { useState, useEffect, useCallback, useMemo, ReactNode, createContext, useContext, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Destination } from '@/types/destination';
import { createClient } from '@/lib/supabase/client';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';

/**
 * Homepage Data Provider with Full Features
 *
 * Provides:
 * - Data loading with fallback (Supabase -> Static JSON)
 * - Pagination (page-based, 4 rows per page)
 * - City/Category filtering
 * - Search functionality
 * - View mode (grid/map)
 * - Destination drawer state
 */

interface HomepageDataContextType {
  // Data
  destinations: Destination[];
  filteredDestinations: Destination[];
  displayedDestinations: Destination[];
  cities: string[];
  categories: string[];

  // State
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  currentPage: number;
  totalPages: number;
  selectedCity: string;
  selectedCategory: string;
  searchTerm: string;
  viewMode: 'grid' | 'map';

  // Drawer state
  selectedDestination: Destination | null;
  isDrawerOpen: boolean;

  // AI Chat state
  isAIChatOpen: boolean;
  aiChatInitialQuery: string;

  // Advanced filters
  michelinOnly: boolean;
  crownOnly: boolean;

  // Grid visibility
  showGrid: boolean;

  // Actions
  setCurrentPage: (page: number) => void;
  setSelectedCity: (city: string) => void;
  setSelectedCategory: (category: string) => void;
  setSearchTerm: (term: string) => void;
  setViewMode: (mode: 'grid' | 'map') => void;
  clearFilters: () => void;
  openDestination: (destination: Destination) => void;
  closeDrawer: () => void;
  openAIChat: (initialQuery?: string) => void;
  closeAIChat: () => void;
  setMichelinOnly: (value: boolean) => void;
  setCrownOnly: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  refetch: () => Promise<void>;
}

const HomepageDataContext = createContext<HomepageDataContextType | null>(null);

export function useHomepageData() {
  const context = useContext(HomepageDataContext);
  if (!context) {
    throw new Error('useHomepageData must be used within HomepageDataProvider');
  }
  return context;
}

interface HomepageDataProviderProps {
  children: ReactNode;
  serverDestinations: Destination[];
  serverCities: string[];
  serverCategories: string[];
}

/**
 * Extract unique cities and categories from destinations
 */
function extractFilters(destinations: Destination[]): { cities: string[]; categories: string[] } {
  const citySet = new Set<string>();
  const categorySet = new Set<string>();

  destinations.forEach((dest) => {
    const city = (dest.city ?? '').toString().trim();
    const category = (dest.category ?? '').toString().trim();
    if (city) citySet.add(city);
    if (category) categorySet.add(category);
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: Array.from(categorySet).sort(),
  };
}

function HomepageDataProviderInner({
  children,
  serverDestinations,
  serverCities,
  serverCategories,
}: HomepageDataProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core data state
  const [destinations, setDestinations] = useState<Destination[]>(serverDestinations);
  const [cities, setCities] = useState<string[]>(serverCities);
  const [categories, setCategories] = useState<string[]>(serverCategories);
  const [isLoading, setIsLoading] = useState(serverDestinations.length === 0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4); // 4 rows

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Drawer state - now delegated to IntelligentDrawer
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();

  // AI Chat state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatInitialQuery, setAIChatInitialQuery] = useState('');

  // Advanced filters
  const [michelinOnly, setMichelinOnly] = useState(false);
  const [crownOnly, setCrownOnly] = useState(false);

  // Grid visibility - hidden by default, shown via "Show All"
  const [showGrid, setShowGrid] = useState(false);

  // Initialize view mode from URL
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'map') setViewMode('map');
    else if (viewParam === 'grid') setViewMode('grid');
  }, [searchParams]);

  // Fetch destinations from Supabase
  const fetchDestinations = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destinations')
        .select(`
          id, slug, name, city, country, neighborhood, category,
          micro_description, description, image, image_thumbnail,
          michelin_stars, crown, rating, price_level, tags,
          latitude, longitude
        `)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(1000);

      if (error) {
        console.error('[Client] Supabase error:', error);
        setHasError(true);
        setErrorMessage('Unable to load destinations. Please check your connection.');
        return;
      }

      if (data && data.length > 0) {
        setDestinations(data as Destination[]);
        const filters = extractFilters(data as Destination[]);
        setCities(filters.cities);
        setCategories(filters.categories);
        setHasError(false);
        setErrorMessage(null);
      } else {
        setHasError(true);
        setErrorMessage('No destinations available. Please try again later.');
      }
    } catch (error) {
      console.error('[Client] Error fetching destinations:', error);
      setHasError(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Client-side fallback fetch when server data is empty
  useEffect(() => {
    if (serverDestinations.length > 0) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    fetchDestinations();
  }, [serverDestinations, fetchDestinations]);

  // Filter destinations based on selected filters
  const filteredDestinations = useMemo(() => {
    let filtered = [...destinations];

    // Filter by city
    if (selectedCity) {
      filtered = filtered.filter(d =>
        d.city?.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(d =>
        d.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search term (local search)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(term) ||
        d.city?.toLowerCase().includes(term) ||
        d.category?.toLowerCase().includes(term) ||
        d.neighborhood?.toLowerCase().includes(term) ||
        d.micro_description?.toLowerCase().includes(term)
      );
    }

    // Filter by Michelin stars
    if (michelinOnly) {
      filtered = filtered.filter(d =>
        d.michelin_stars && d.michelin_stars > 0
      );
    }

    // Filter by Crown (Editor's Pick)
    if (crownOnly) {
      filtered = filtered.filter(d => d.crown === true);
    }

    return filtered;
  }, [destinations, selectedCity, selectedCategory, searchTerm, michelinOnly, crownOnly]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  // Get current page of destinations
  const displayedDestinations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDestinations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDestinations, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedCategory, searchTerm, michelinOnly, crownOnly]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedCity('');
    setSelectedCategory('');
    setSearchTerm('');
    setMichelinOnly(false);
    setCrownOnly(false);
    setCurrentPage(1);
  }, []);

  // Update URL when view mode changes
  const handleSetViewMode = useCallback((mode: 'grid' | 'map') => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    router.push(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Open destination in drawer - now uses IntelligentDrawer
  const openDestination = useCallback((destination: Destination) => {
    openIntelligentDrawer(destination);
  }, [openIntelligentDrawer]);

  // Close drawer - no-op as IntelligentDrawer handles its own close
  const closeDrawer = useCallback(() => {
    // IntelligentDrawer handles its own close via the X button or backdrop click
  }, []);

  // Open AI chat with optional initial query
  const openAIChat = useCallback((initialQuery?: string) => {
    if (initialQuery) {
      setAIChatInitialQuery(initialQuery);
    }
    setIsAIChatOpen(true);
  }, []);

  // Close AI chat
  const closeAIChat = useCallback(() => {
    setIsAIChatOpen(false);
    // Clear initial query after close animation
    setTimeout(() => setAIChatInitialQuery(''), 300);
  }, []);

  const contextValue: HomepageDataContextType = {
    destinations,
    filteredDestinations,
    displayedDestinations,
    cities,
    categories,
    isLoading,
    hasError,
    errorMessage,
    currentPage,
    totalPages,
    selectedCity,
    selectedCategory,
    searchTerm,
    viewMode,
    selectedDestination: null, // Now handled by IntelligentDrawer
    isDrawerOpen: false, // Now handled by IntelligentDrawer
    isAIChatOpen,
    aiChatInitialQuery,
    michelinOnly,
    crownOnly,
    showGrid,
    setCurrentPage,
    setSelectedCity,
    setSelectedCategory,
    setSearchTerm,
    setViewMode: handleSetViewMode,
    clearFilters,
    openDestination,
    closeDrawer,
    openAIChat,
    closeAIChat,
    setMichelinOnly,
    setCrownOnly,
    setShowGrid,
    refetch: fetchDestinations,
  };

  return (
    <HomepageDataContext.Provider value={contextValue}>
      {children}
    </HomepageDataContext.Provider>
  );
}

// Wrap with Suspense for useSearchParams
export function HomepageDataProvider(props: HomepageDataProviderProps) {
  return (
    <Suspense fallback={null}>
      <HomepageDataProviderInner {...props} />
    </Suspense>
  );
}

export default HomepageDataProvider;
