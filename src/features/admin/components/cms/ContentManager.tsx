'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useKeyboardShortcuts, formatShortcut, type Shortcut } from '@/domain/hooks/useKeyboardShortcuts';
import {
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Crown,
  Globe,
  Image as ImageIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  MapPin,
  Download,
  Sparkles,
  AlertTriangle,
  FileText,
  Tag,
  Calendar,
  Columns3,
  Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { Skeleton } from '@/ui/skeleton';
import { Separator } from '@/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';

interface ContentManagerProps {
  onEditDestination?: (destination: Destination) => void;
  onCreateNew?: () => void;
  /** When this value changes, data is refetched without resetting pagination */
  refreshTrigger?: number;
}

type SortField = 'name' | 'city' | 'category' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';
type EnrichedFilter = 'all' | 'enriched' | 'not_enriched';
type MissingDataFilter = 'all' | 'no_image' | 'no_description' | 'no_content';

const CATEGORIES = [
  'restaurant',
  'hotel',
  'bar',
  'cafe',
  'gallery',
  'museum',
  'shop',
  'landmark',
  'park',
  'beach',
  'market',
  'spa',
  'club',
];

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_ITEMS_PER_PAGE = 24;

// Column configuration for table view
type ColumnId = 'city' | 'neighborhood' | 'category' | 'completeness' | 'status' | 'rating' | 'address' | 'brand';

/** Compute a 0–100 completeness score for a destination based on key fields */
function getCompletenessScore(dest: Destination): number {
  const fields: { key: keyof Destination; weight: number }[] = [
    { key: 'image', weight: 20 },
    { key: 'description', weight: 15 },
    { key: 'micro_description', weight: 10 },
    { key: 'content', weight: 10 },
    { key: 'neighborhood', weight: 5 },
    { key: 'country', weight: 5 },
    { key: 'formatted_address', weight: 5 },
    { key: 'latitude', weight: 5 },
    { key: 'website', weight: 5 },
    { key: 'phone_number', weight: 5 },
    { key: 'rating', weight: 5 },
    { key: 'tags', weight: 5 },
    { key: 'last_enriched_at', weight: 5 },
  ];
  let score = 0;
  for (const { key, weight } of fields) {
    const val = dest[key];
    if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      score += weight;
    }
  }
  return score;
}

interface ColumnConfig {
  id: ColumnId;
  label: string;
  sortable?: boolean;
  sortField?: SortField;
}

const TABLE_COLUMNS: ColumnConfig[] = [
  { id: 'city', label: 'City', sortable: true, sortField: 'city' },
  { id: 'neighborhood', label: 'Neighborhood' },
  { id: 'category', label: 'Category', sortable: true, sortField: 'category' },
  { id: 'completeness', label: 'Complete' },
  { id: 'status', label: 'Status' },
  { id: 'rating', label: 'Rating' },
  { id: 'address', label: 'Address' },
  { id: 'brand', label: 'Brand' },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = ['city', 'category', 'status'];

const getSortLabel = (field: SortField, order: SortOrder): string => {
  const labels: Record<SortField, Partial<Record<SortOrder, string>>> = {
    name: { asc: 'Name A-Z', desc: 'Name Z-A' },
    city: { asc: 'City A-Z', desc: 'City Z-A' },
    category: { asc: 'Category A-Z', desc: 'Category Z-A' },
    updated_at: { desc: 'Recently Updated' },
    created_at: { desc: 'Recently Added' },
  };
  return labels[field]?.[order] || 'Sort';
};

export function ContentManager({ onEditDestination, onCreateNew, refreshTrigger }: ContentManagerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  // Read initial state from URL params
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams?.get('category') || '');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams?.get('city') || '');
  const [sortField, setSortField] = useState<SortField>((searchParams?.get('sort') as SortField) || 'name');
  const [sortOrder, setSortOrder] = useState<SortOrder>((searchParams?.get('order') as SortOrder) || 'asc');
  const [page, setPage] = useState(Number(searchParams?.get('page')) || 1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams?.get('view') as ViewMode) || 'table');
  const [showFilters, setShowFilters] = useState(
    !!(searchParams?.get('category') || searchParams?.get('city') || searchParams?.get('enriched') || searchParams?.get('crown') || searchParams?.get('michelin') || searchParams?.get('missing'))
  );
  const [cities, setCities] = useState<string[]>([]);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  // Filter states
  const [enrichedFilter, setEnrichedFilter] = useState<EnrichedFilter>((searchParams?.get('enriched') as EnrichedFilter) || 'all');
  const [crownOnly, setCrownOnly] = useState(searchParams?.get('crown') === 'true');
  const [michelinOnly, setMichelinOnly] = useState(searchParams?.get('michelin') === 'true');
  const [missingDataFilter, setMissingDataFilter] = useState<MissingDataFilter>((searchParams?.get('missing') as MissingDataFilter) || 'all');
  const [itemsPerPage, setItemsPerPage] = useState(Number(searchParams?.get('per_page')) || DEFAULT_ITEMS_PER_PAGE);

  // Sync state to URL params (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedCity) params.set('city', selectedCity);
    if (sortField !== 'name') params.set('sort', sortField);
    if (sortOrder !== 'asc') params.set('order', sortOrder);
    if (page > 1) params.set('page', String(page));
    if (viewMode !== 'table') params.set('view', viewMode);
    if (enrichedFilter !== 'all') params.set('enriched', enrichedFilter);
    if (crownOnly) params.set('crown', 'true');
    if (michelinOnly) params.set('michelin', 'true');
    if (missingDataFilter !== 'all') params.set('missing', missingDataFilter);
    if (itemsPerPage !== DEFAULT_ITEMS_PER_PAGE) params.set('per_page', String(itemsPerPage));

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, selectedCity, sortField, sortOrder, page, viewMode, enrichedFilter, crownOnly, michelinOnly, missingDataFilter, itemsPerPage, pathname, router]);
  // Bulk action states
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(DEFAULT_VISIBLE_COLUMNS));

  // Fetch unique cities
  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase
        .from('destinations')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (data) {
        const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))] as string[];
        setCities(uniqueCities);
      }
    }
    fetchCities();
  }, []);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery) return cities;
    return cities.filter(city =>
      city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );
  }, [cities, citySearchQuery]);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' });

      // Text search with proper escaping
      if (searchQuery && searchQuery.trim()) {
        const escaped = searchQuery.trim().replace(/[%_]/g, '\\$&');
        query = query.or(`name.ilike.%${escaped}%,city.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
      }

      // Category filter
      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // City filter
      if (selectedCity && selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }

      // Enrichment status filter
      if (enrichedFilter === 'enriched') {
        query = query.not('last_enriched_at', 'is', null);
      } else if (enrichedFilter === 'not_enriched') {
        query = query.is('last_enriched_at', null);
      }

      // Crown filter
      if (crownOnly) {
        query = query.eq('crown', true);
      }

      // Michelin filter
      if (michelinOnly) {
        query = query.gt('michelin_stars', 0);
      }

      // Missing data filters
      if (missingDataFilter === 'no_image') {
        query = query.or('image.is.null,image.eq.');
      } else if (missingDataFilter === 'no_description') {
        query = query.or('description.is.null,description.eq.');
      } else if (missingDataFilter === 'no_content') {
        query = query.or('content.is.null,content.eq.');
      }

      // Sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setDestinations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      setDestinations([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCity, sortField, sortOrder, page, enrichedFilter, crownOnly, michelinOnly, missingDataFilter, itemsPerPage]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Refetch when refreshTrigger changes (without resetting pagination)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchDestinations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedCity, enrichedFilter, crownOnly, michelinOnly, missingDataFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === destinations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(destinations.map(d => d.id!)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} destinations? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete destinations');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this destination? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete destination');
    }
    setActiveDropdown(null);
  };

  const handleDuplicate = async (destination: Destination) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = destination;
      const { error } = await supabase.from('destinations').insert({
        ...rest,
        name: `${destination.name} (Copy)`,
        slug: `${destination.slug}-copy-${Date.now()}`,
      });
      if (error) throw error;
      fetchDestinations();
    } catch (error) {
      console.error('Duplicate failed:', error);
      alert('Failed to duplicate destination');
    }
    setActiveDropdown(null);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedCity('');
    setSearchQuery('');
    setEnrichedFilter('all');
    setCrownOnly(false);
    setMichelinOnly(false);
    setMissingDataFilter('all');
  };

  const toggleColumn = (columnId: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const hasActiveFilters = !!(
    selectedCategory ||
    selectedCity ||
    searchQuery ||
    enrichedFilter !== 'all' ||
    crownOnly ||
    michelinOnly ||
    missingDataFilter !== 'all'
  );

  const activeFilterCount = [
    selectedCategory,
    selectedCity,
    enrichedFilter !== 'all' ? enrichedFilter : '',
    crownOnly ? 'crown' : '',
    michelinOnly ? 'michelin' : '',
    missingDataFilter !== 'all' ? missingDataFilter : '',
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Keyboard navigation shortcuts for pagination
  const paginationShortcuts: Shortcut[] = useMemo(() => [
    {
      id: 'prev-page',
      key: 'ArrowLeft',
      handler: () => {
        if (page > 1) setPage(page - 1);
      },
      description: 'Previous page',
      category: 'Navigation',
    },
    {
      id: 'next-page',
      key: 'ArrowRight',
      handler: () => {
        if (page < totalPages) setPage(page + 1);
      },
      description: 'Next page',
      category: 'Navigation',
    },
    {
      id: 'first-page',
      key: 'Home',
      handler: () => setPage(1),
      description: 'First page',
      category: 'Navigation',
    },
    {
      id: 'last-page',
      key: 'End',
      handler: () => setPage(totalPages || 1),
      description: 'Last page',
      category: 'Navigation',
    },
  ], [page, totalPages, setPage]);

  useKeyboardShortcuts({
    shortcuts: paginationShortcuts,
    context: 'list',
    enabled: totalPages > 1,
  });

  // Bulk actions handlers
  const handleBulkEnrich = async () => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    try {
      // Get slugs for selected items
      const selectedDests = destinations.filter(d => selectedItems.has(d.id!));
      const slugs = selectedDests.map(d => d.slug);

      // Call enrich API for each (could batch this)
      for (const slug of slugs) {
        await fetch('/api/enrich-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
      }

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk enrich failed:', error);
      alert('Failed to enrich destinations');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkCategoryChange = async (category: string) => {
    if (selectedItems.size === 0 || !category) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ category })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      setShowBulkCategoryModal(false);
      fetchDestinations();
    } catch (error) {
      console.error('Bulk category change failed:', error);
      alert('Failed to update categories');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkToggleCrown = async (crownValue: boolean) => {
    if (selectedItems.size === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ crown: crownValue })
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      setSelectedItems(new Set());
      fetchDestinations();
    } catch (error) {
      console.error('Bulk crown toggle failed:', error);
      alert('Failed to update crown status');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportSelected = () => {
    const selectedDests = destinations.filter(d => selectedItems.has(d.id!));
    const csv = [
      ['name', 'city', 'category', 'slug', 'michelin_stars', 'crown', 'enriched'].join(','),
      ...selectedDests.map(d => [
        `"${d.name}"`,
        `"${d.city}"`,
        d.category,
        d.slug,
        d.michelin_stars || 0,
        d.crown ? 'Yes' : 'No',
        d.last_enriched_at ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destinations-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
            {totalCount.toLocaleString()} destinations
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-black dark:text-white hover:opacity-60 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>
      </div>

      {/* Toolbar */}
      <div className="pb-2 space-y-3">
        {/* Search + View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-8 text-xs rounded-lg border-transparent bg-gray-50 dark:bg-gray-900/50 focus:border-gray-200 dark:focus:border-gray-700 focus:bg-white dark:focus:bg-gray-900"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              showFilters || hasActiveFilters
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Column Toggle - Only show in table view */}
          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
                >
                  <Columns3 className="w-3 h-3" />
                  <span className="hidden sm:inline">Columns</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Toggle columns</p>
                </div>
                <DropdownMenuSeparator />
                {TABLE_COLUMNS.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleColumn(column.id);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={visibleColumns.has(column.id)}
                      className="pointer-events-none"
                    />
                    <span>{column.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="hidden sm:flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('table')}
              aria-label="Switch to table view"
              aria-pressed={viewMode === 'table'}
              className={`p-1.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none ${
                viewMode === 'table'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Switch to grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-1.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none ${
                viewMode === 'grid'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
            {/* Row 1: City, Category, Status */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* City Filter */}
              <Popover open={showCityDropdown} onOpenChange={setShowCityDropdown}>
                <PopoverTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                      selectedCity
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{selectedCity || 'All Cities'}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 rounded-xl" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search cities..."
                      value={citySearchQuery}
                      onValueChange={setCitySearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setSelectedCity('');
                            setShowCityDropdown(false);
                            setCitySearchQuery('');
                          }}
                          className={!selectedCity ? 'font-medium' : ''}
                        >
                          <Check className={`w-4 h-4 mr-2 ${!selectedCity ? 'opacity-100' : 'opacity-0'}`} />
                          All Cities
                        </CommandItem>
                        {filteredCities.map((city) => (
                          <CommandItem
                            key={city}
                            onSelect={() => {
                              setSelectedCity(city);
                              setShowCityDropdown(false);
                              setCitySearchQuery('');
                            }}
                            className={selectedCity === city ? 'font-medium' : ''}
                          >
                            <Check className={`w-4 h-4 mr-2 ${selectedCity === city ? 'opacity-100' : 'opacity-0'}`} />
                            {city}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                      selectedCategory
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : 'All Categories'}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={() => setSelectedCategory('')} className={!selectedCategory ? 'font-medium' : ''}>
                    All Categories
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? 'font-medium' : ''}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Enrichment Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                      enrichedFilter !== 'all'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{enrichedFilter === 'all' ? 'All Status' : enrichedFilter === 'enriched' ? 'Enriched' : 'Not Enriched'}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={() => setEnrichedFilter('all')} className={enrichedFilter === 'all' ? 'font-medium' : ''}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEnrichedFilter('enriched')} className={enrichedFilter === 'enriched' ? 'font-medium' : ''}>
                    Enriched
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEnrichedFilter('not_enriched')} className={enrichedFilter === 'not_enriched' ? 'font-medium' : ''}>
                    Not Enriched
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Missing Data Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                      missingDataFilter !== 'all'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{missingDataFilter === 'all' ? 'All Data' : missingDataFilter === 'no_image' ? 'Missing Image' : missingDataFilter === 'no_description' ? 'Missing Description' : 'Missing Content'}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={() => setMissingDataFilter('all')} className={missingDataFilter === 'all' ? 'font-medium' : ''}>
                    All Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setMissingDataFilter('no_image')} className={missingDataFilter === 'no_image' ? 'font-medium' : ''}>
                    Missing Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMissingDataFilter('no_description')} className={missingDataFilter === 'no_description' ? 'font-medium' : ''}>
                    Missing Description
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMissingDataFilter('no_content')} className={missingDataFilter === 'no_content' ? 'font-medium' : ''}>
                    Missing Content
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Row 2: Quick Filters + Sort */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Quick Filter Toggles */}
              <button
                onClick={() => setCrownOnly(!crownOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  crownOnly
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-500" />
                <span>Crown Only</span>
              </button>
              <button
                onClick={() => setMichelinOnly(!michelinOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  michelinOnly
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <img src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
                <span>Michelin Only</span>
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}

              {/* Sort + Show - right aligned */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Sort</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150">
                      <span>{getSortLabel(sortField, sortOrder)}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('asc'); }}>Name A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('desc'); }}>Name Z-A</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSortField('city'); setSortOrder('asc'); }}>City A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('city'); setSortOrder('desc'); }}>City Z-A</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSortField('category'); setSortOrder('asc'); }}>Category A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('updated_at'); setSortOrder('desc'); }}>Recently Updated</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('created_at'); setSortOrder('desc'); }}>Recently Added</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="text-xs text-gray-400 uppercase tracking-wider">Show</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150">
                      <span>{itemsPerPage}</span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <DropdownMenuItem key={n} onClick={() => setItemsPerPage(n)}>{n}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-medium whitespace-nowrap">{selectedItems.size} selected</Badge>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
          </div>

          {/* Scrollable actions on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {/* Category Change */}
            <Popover open={showBulkCategoryModal} onOpenChange={setShowBulkCategoryModal}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={bulkActionLoading} className="shrink-0">
                  <Tag className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Category</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2">Change category to:</p>
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start capitalize"
                      onClick={() => handleBulkCategoryChange(cat)}
                      disabled={bulkActionLoading}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Crown Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={bulkActionLoading} className="shrink-0">
                  <Crown className="w-3.5 h-3.5 sm:mr-1.5 text-amber-500" />
                  <span className="hidden sm:inline">Crown</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleBulkToggleCrown(true)}>
                  <Crown className="w-4 h-4 mr-2 text-amber-500" />
                  Add Crown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkToggleCrown(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Remove Crown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Enrich */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkEnrich}
              disabled={bulkActionLoading}
              className="shrink-0"
            >
              {bulkActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin sm:mr-1.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline">Enrich</span>
            </Button>

            {/* Export */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportSelected}
              disabled={bulkActionLoading}
              className="shrink-0"
            >
              <Download className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Separator orientation="vertical" className="h-5 hidden sm:block shrink-0" />

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin sm:mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />}
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>

          <div className="hidden sm:block sm:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <LoadingState viewMode={viewMode} />
      ) : destinations.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
      ) : viewMode === 'grid' ? (
        <GridView
          destinations={destinations}
          selectedItems={selectedItems}
          toggleSelect={toggleSelect}
          onEdit={onEditDestination}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
        />
      ) : (
        <TableView
          destinations={destinations}
          selectedItems={selectedItems}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          onEdit={onEditDestination}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
          handleSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          visibleColumns={visibleColumns}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4" role="navigation" aria-label="Pagination">
          <div className="flex items-center gap-3 order-2 sm:order-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {((page - 1) * itemsPerPage) + 1}–{Math.min(page * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-0.5 order-1 sm:order-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Go to previous page"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Page numbers - show fewer on mobile */}
            <div className="flex items-center">
              {Array.from({ length: Math.min(typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                const maxPages = 5;
                let pageNum: number;
                if (totalPages <= maxPages) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - maxPages + 1 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={page === pageNum ? 'page' : undefined}
                    className={`w-7 h-7 rounded-md text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none ${
                      page === pageNum
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Go to next page"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({
  destinations,
  selectedItems,
  toggleSelect,
  toggleSelectAll,
  onEdit,
  activeDropdown,
  setActiveDropdown,
  handleDelete,
  handleDuplicate,
  handleSort,
  sortField,
  sortOrder,
  visibleColumns,
}: {
  destinations: Destination[];
  selectedItems: Set<number>;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;
  onEdit?: (destination: Destination) => void;
  activeDropdown: number | null;
  setActiveDropdown: (id: number | null) => void;
  handleDelete: (id: number) => void;
  handleDuplicate: (destination: Destination) => void;
  handleSort: (field: SortField) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  visibleColumns: Set<ColumnId>;
}) {
  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium transition-colors ${
        sortField === field
          ? 'text-black/60 dark:text-gray-300'
          : 'text-black/25 dark:text-gray-600 hover:text-black/50 dark:hover:text-gray-400'
      }`}
    >
      {children}
      <ArrowUpDown className={`w-2.5 h-2.5 ${sortField === field ? 'opacity-100' : 'opacity-0'} ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-all`} />
    </button>
  );

  // Render cell content based on column type
  const renderCell = (columnId: ColumnId, dest: Destination) => {
    switch (columnId) {
      case 'city':
        return <span className="text-[13px] text-gray-400 dark:text-gray-500">{dest.city || '—'}</span>;
      case 'neighborhood':
        return <span className="text-[13px] text-gray-400 dark:text-gray-500">{dest.neighborhood || '—'}</span>;
      case 'category':
        return <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">{dest.category}</span>;
      case 'completeness': {
        const score = getCompletenessScore(dest);
        const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600';
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{score}%</span>
          </div>
        );
      }
      case 'status':
        return (
          <div className="flex items-center gap-1">
            {dest.last_enriched_at && (
              <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
            )}
            {dest.image && (
              <ImageIcon className="w-3 h-3 text-gray-300 dark:text-gray-600" />
            )}
          </div>
        );
      case 'rating':
        return dest.rating ? (
          <span className="inline-flex items-center gap-1 text-[13px] text-gray-400 dark:text-gray-500">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {dest.rating.toFixed(1)}
          </span>
        ) : (
          <span className="text-[13px] text-gray-300 dark:text-gray-600">—</span>
        );
      case 'address':
        return (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[200px] block">
            {dest.formatted_address || '—'}
          </span>
        );
      case 'brand':
        return <span className="text-[13px] text-gray-400 dark:text-gray-500">{dest.brand || '—'}</span>;
      default:
        return null;
    }
  };

  // Render header for each column
  const renderHeader = (columnId: ColumnId) => {
    const column = TABLE_COLUMNS.find(c => c.id === columnId);
    if (!column) return null;

    if (column.sortable && column.sortField) {
      return <SortButton field={column.sortField}>{column.label}</SortButton>;
    }
    return (
      <span className="text-[11px] uppercase tracking-wider text-black/25 dark:text-gray-600 font-medium">
        {column.label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800/50">
            <th className="w-8 pl-0 pr-2 py-2 text-left">
              <Checkbox
                checked={selectedItems.size === destinations.length && destinations.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            <th className="px-2 py-2 text-left">
              <SortButton field="name">Name</SortButton>
            </th>
            {TABLE_COLUMNS.filter(col => visibleColumns.has(col.id)).map(column => (
              <th key={column.id} className="px-2 py-2 text-left">
                {renderHeader(column.id)}
              </th>
            ))}
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
          {destinations.map((dest) => (
            <tr
              key={dest.id}
              className={`group transition-colors ${
                selectedItems.has(dest.id!)
                  ? 'bg-gray-50 dark:bg-gray-900/50'
                  : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/20'
              }`}
            >
              <td className="pl-0 pr-2 py-2">
                <Checkbox
                  checked={selectedItems.has(dest.id!)}
                  onCheckedChange={() => toggleSelect(dest.id!)}
                />
              </td>
              <td className="px-2 py-2">
                <button
                  onClick={() => onEdit?.(dest)}
                  className="flex items-center gap-2.5 text-left group/cell"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {dest.image ? (
                      <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] text-gray-900 dark:text-white truncate group-hover/cell:opacity-60 transition-opacity">{dest.name}</span>
                      {dest.crown && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                      {dest.michelin_stars && dest.michelin_stars > 0 && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                            <img key={i} src="/michelin-star.svg" alt="Michelin" className="w-2.5 h-2.5" />
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block">{dest.slug}</span>
                  </div>
                </button>
              </td>
              {TABLE_COLUMNS.filter(col => visibleColumns.has(col.id)).map(column => (
                <td key={column.id} className="px-2 py-2">
                  {renderCell(column.id, dest)}
                </td>
              ))}
              <td className="px-2 py-2">
                <RowActions
                  destination={dest}
                  isActive={activeDropdown === dest.id}
                  onToggle={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
                  onClose={() => setActiveDropdown(null)}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Grid View Component - Uses homepage card styles
function GridView({
  destinations,
  selectedItems,
  toggleSelect,
  onEdit,
  activeDropdown,
  setActiveDropdown,
  handleDelete,
  handleDuplicate,
}: {
  destinations: Destination[];
  selectedItems: Set<number>;
  toggleSelect: (id: number) => void;
  onEdit?: (destination: Destination) => void;
  activeDropdown: number | null;
  setActiveDropdown: (id: number | null) => void;
  handleDelete: (id: number) => void;
  handleDuplicate: (destination: Destination) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {destinations.map((dest) => (
        <div key={dest.id} className="relative">
          {/* Selection overlay */}
          <div className={`absolute inset-0 z-10 pointer-events-none rounded-lg transition-all ${
            selectedItems.has(dest.id!)
              ? 'ring-1 ring-gray-400 dark:ring-gray-500 bg-black/5 dark:bg-white/5'
              : ''
          }`} />

          {/* Checkbox */}
          <div className="absolute top-2 left-2 z-20">
            <Checkbox
              checked={selectedItems.has(dest.id!)}
              onCheckedChange={() => toggleSelect(dest.id!)}
              className="bg-white/90 dark:bg-gray-900/90 shadow-sm"
            />
          </div>

          {/* Actions */}
          <div className="absolute top-2 right-2 z-20">
            <RowActions
              destination={dest}
              isActive={activeDropdown === dest.id}
              onToggle={() => setActiveDropdown(activeDropdown === dest.id ? null : dest.id!)}
              onClose={() => setActiveDropdown(null)}
              onEdit={onEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              compact
            />
          </div>

          {/* Card using homepage styles */}
          <button
            onClick={() => onEdit?.(dest)}
            className={`${CARD_WRAPPER} w-full text-left`}
          >
            <div className={CARD_MEDIA}>
              {dest.image ? (
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <MapPin className="h-8 w-8 opacity-20" />
                </div>
              )}
              {/* Michelin stars badge */}
              {dest.michelin_stars && dest.michelin_stars > 0 && (
                <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs font-medium flex items-center gap-0.5">
                  {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                    <img key={i} src="/michelin-star.svg" alt="Michelin" className="w-3 h-3" />
                  ))}
                </div>
              )}
              {/* Crown badge */}
              {dest.crown && (
                <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-900 p-1.5 rounded">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div className={CARD_TITLE}>{dest.name}</div>
              <div className={CARD_META}>
                <MapPin className="h-3 w-3" />
                <span>{dest.city}</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="capitalize">{dest.category}</span>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

// Row Actions Dropdown
function RowActions({
  destination,
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}: {
  destination: Destination;
  isActive?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onEdit?: (destination: Destination) => void;
  onDelete: (id: number) => void;
  onDuplicate: (destination: Destination) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? 'bg-white/90 dark:bg-gray-900/90 shadow-sm h-8 w-8' : 'h-8 w-8'}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit?.(destination)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`/destinations/${destination.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(destination)}>
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(destination.id!)}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Loading State - Matches homepage card skeleton
function LoadingState({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-2">No destinations found</p>
      {hasFilters && (
        <Button variant="link" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
