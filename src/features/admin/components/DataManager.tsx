'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Search, Plus, Pencil, Trash2, X, Upload, Loader2, ChevronLeft, MoreVertical,
  Building2, MapPin, Globe, Map, AlertCircle, ExternalLink, RefreshCw, Merge, Settings2, Check, Compass
} from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { Separator } from '@/ui/separator';
import { toSlug } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu';

// Use API route for admin operations to bypass RLS
async function apiRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const url = method === 'GET' || method === 'DELETE'
    ? `/api/admin/data?${new URLSearchParams(params as Record<string, string>)}`
    : '/api/admin/data';

  const res = await fetch(url, {
    method,
    headers: method !== 'GET' && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {},
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(params) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  category: string | null;
}

interface City {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  slug: string;
  image_url: string | null;
  description: string | null;
}

interface Country {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  flag_emoji: string | null;
  image_url: string | null;
}

interface Neighborhood {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface Architect {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  birth_year: number | null;
  death_year: number | null;
  nationality: string | null;
  design_philosophy: string | null;
  image_url: string | null;
}

type DataType = 'brands' | 'cities' | 'countries' | 'neighborhoods' | 'architects';
type DataItem = Brand | City | Country | Neighborhood | Architect;

interface DataManagerProps {
  type: DataType;
}

const BRAND_CATEGORIES = [
  'Luxury Hotel',
  'Upper Upscale Hotel',
  'Upscale Hotel',
  'Boutique Hotel',
  'Lifestyle Hotel',
  'Restaurant Group',
  'Hospitality Group',
  'Other',
];

const TYPE_CONFIG = {
  brands: { singular: 'Brand', plural: 'Brands', icon: Building2 },
  cities: { singular: 'City', plural: 'Cities', icon: MapPin },
  countries: { singular: 'Country', plural: 'Countries', icon: Globe },
  neighborhoods: { singular: 'Neighborhood', plural: 'Neighborhoods', icon: Map },
  architects: { singular: 'Architect', plural: 'Architects', icon: Compass },
};


export function DataManager({ type }: DataManagerProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ found: number; inserted: number; existing: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | null>>({});

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSource, setMergeSource] = useState<DataItem | null>(null);
  const [mergeTarget, setMergeTarget] = useState<DataItem | null>(null);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergePreview, setMergePreview] = useState<{ affectedCount: number } | null>(null);
  const [merging, setMerging] = useState(false);
  const [deleteAfterMerge, setDeleteAfterMerge] = useState(true);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    category: true,
    location: true,
    code: true,
    nationality: true,
    slug: true,
  });

  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const supabase = createClient({ skipValidation: true });
  const config = TYPE_CONFIG[type];

  useEffect(() => {
    fetchData();
  }, [type]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showDrawer) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showDrawer]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ data: DataItem[] }>('GET', { type });
      setItems(result.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch';
      if (message.includes('does not exist')) {
        setError(`The "${type}" table doesn't exist yet. Please run the database migration first.`);
      } else {
        setError(message);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDrawer = () => {
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
    setShowDrawer(true);
  };

  const openEditDrawer = (item: DataItem) => {
    setEditingItem(item);
    setFormData({ ...item } as Record<string, string | null>);
    setSaveError(null);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingItem(null);
    setFormData({});
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const slug = formData.slug || toSlug(formData.name || '');
      const { id: _id, ...restFormData } = formData as Record<string, string | null> & { id?: string };
      const insertData = { ...restFormData, slug };

      if (editingItem) {
        await apiRequest('PUT', { type, id: editingItem.id, data: insertData });
      } else {
        await apiRequest('POST', { type, data: insertData });
      }
      await fetchData();
      closeDrawer();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';

      if (message.includes('does not exist')) {
        setSaveError(`The "${type}" table doesn't exist. Please run the database migration first.`);
      } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
        setSaveError('An item with this name or slug already exists.');
      } else if (message.includes('Unauthorized')) {
        setSaveError('You must be logged in as an admin to perform this action.');
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await apiRequest('DELETE', { type, id });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      alert(`Error: ${message}`);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data.results?.[type] || { found: 0, inserted: 0, existing: 0 });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      alert(`Sync error: ${message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, [field]: publicUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload';
      alert(`Upload error: ${message}`);
    }
  };

  const openMergeModal = async (item: DataItem) => {
    setMergeSource(item);
    setMergeTarget(null);
    setMergeSearch('');
    setMergePreview(null);
    setDeleteAfterMerge(true);
    setShowMergeModal(true);

    // Fetch preview of affected destinations
    try {
      const res = await fetch(`/api/admin/data/merge?type=${type}&sourceId=${item.id}`);
      const data = await res.json();
      if (res.ok) {
        setMergePreview({ affectedCount: data.affectedCount });
      }
    } catch {
      // Ignore preview errors
    }
  };

  const closeMergeModal = () => {
    setShowMergeModal(false);
    setMergeSource(null);
    setMergeTarget(null);
    setMergeSearch('');
    setMergePreview(null);
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;

    setMerging(true);
    try {
      const res = await fetch('/api/admin/data/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          sourceId: mergeSource.id,
          targetId: mergeTarget.id,
          deleteSource: deleteAfterMerge,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');

      let message = `Successfully merged "${mergeSource.name}" into "${mergeTarget.name}". ${data.affectedCount} destinations updated.`;
      if (deleteAfterMerge && !data.sourceDeleted) {
        message += `\n\nWarning: Failed to delete source ${config.singular.toLowerCase()}${data.deleteError ? `: ${data.deleteError}` : '.'}`;
      }
      alert(message);
      closeMergeModal();
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Merge failed';
      alert(`Error: ${message}`);
    } finally {
      setMerging(false);
    }
  };

  const getMergeTargetOptions = () => {
    const query = mergeSearch.toLowerCase();
    return items
      .filter((item) => item.id !== mergeSource?.id)
      .filter((item) => {
        if (!query) return true;
        if (item.name.toLowerCase().includes(query)) return true;
        if ('country' in item && item.country?.toLowerCase().includes(query)) return true;
        if ('city' in item && item.city?.toLowerCase().includes(query)) return true;
        return false;
      })
      .slice(0, 10);
  };

  const toggleSelectAll = () => {
    const currentFiltered = getFilteredItems();
    if (selectedItems.size === currentFiltered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentFiltered.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.size} ${type}? This cannot be undone.`)) return;

    setBulkActionLoading(true);
    try {
      for (const id of selectedItems) {
        await apiRequest('DELETE', { type, id });
      }
      setSelectedItems(new Set());
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bulk delete failed';
      alert(`Error: ${message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (item.name.toLowerCase().includes(query)) return true;
      if ('country' in item && item.country?.toLowerCase().includes(query)) return true;
      if ('city' in item && item.city?.toLowerCase().includes(query)) return true;
      return false;
    });
  };

  const filteredItems = getFilteredItems();
  const Icon = config.icon;

  const inputClasses = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
            {items.length.toLocaleString()} {type}
            {syncResult && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (+{syncResult.inserted} new, {syncResult.existing} existing)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
            title={`Sync ${type} from existing destinations`}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-black dark:text-white hover:opacity-60 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="pb-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${type}...`}
            className="pl-9 h-8 text-xs rounded-lg border-transparent bg-gray-50 dark:bg-gray-900/50 focus:border-gray-200 dark:focus:border-gray-700 focus:bg-white dark:focus:bg-gray-900"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-medium whitespace-nowrap">
              {selectedItems.size} selected
            </Badge>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto -mx-1 px-1">
            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
            >
              {bulkActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin sm:mr-1.5" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
              )}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <th className="w-8 pl-0 pr-2 py-2">
                  <Checkbox
                    checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                {visibleColumns.name && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2">
                    {config.singular}
                  </th>
                )}
                {type === 'brands' && visibleColumns.category && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2 hidden sm:table-cell">
                    Category
                  </th>
                )}
                {(type === 'cities' || type === 'neighborhoods') && visibleColumns.location && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2 hidden sm:table-cell">
                    Location
                  </th>
                )}
                {type === 'countries' && visibleColumns.code && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2 hidden sm:table-cell">
                    Code
                  </th>
                )}
                {type === 'architects' && visibleColumns.nationality && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2 hidden sm:table-cell">
                    Nationality
                  </th>
                )}
                {visibleColumns.slug && (
                  <th className="text-left text-[11px] font-medium text-black/25 dark:text-gray-600 uppercase tracking-wider px-2 py-2 hidden md:table-cell">
                    Slug
                  </th>
                )}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20",
                    selectedItems.has(item.id) && "bg-gray-50 dark:bg-gray-900/50"
                  )}
                  onClick={() => openEditDrawer(item)}
                >
                  <td className="pl-0 pr-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </td>
                  {visibleColumns.name && (
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2.5">
                        {('logo_url' in item && item.logo_url) || ('image_url' in item && item.image_url) ? (
                          <img
                            src={('logo_url' in item ? item.logo_url : (item as City | Country | Neighborhood).image_url) || ''}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {type === 'countries' && 'flag_emoji' in item && item.flag_emoji ? (
                              <span className="text-sm">{item.flag_emoji}</span>
                            ) : (
                              <Icon className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] text-gray-900 dark:text-white truncate">{item.name}</div>
                          {'website' in item && item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-0.5 transition-colors"
                            >
                              Website <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {type === 'brands' && visibleColumns.category && (
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <span className="text-[13px] text-gray-400 dark:text-gray-500">
                        {'category' in item ? item.category || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {(type === 'cities' || type === 'neighborhoods') && visibleColumns.location && (
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <span className="text-[13px] text-gray-400 dark:text-gray-500">
                        {'city' in item && item.city ? `${item.city}, ` : ''}
                        {'country' in item ? item.country || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {type === 'countries' && visibleColumns.code && (
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <span className="text-[13px] text-gray-400 dark:text-gray-500">
                        {'code' in item ? item.code || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {type === 'architects' && visibleColumns.nationality && (
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <span className="text-[13px] text-gray-400 dark:text-gray-500">
                        {'nationality' in item ? item.nationality || '—' : '—'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.slug && (
                    <td className="px-2 py-2 hidden md:table-cell">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {item.slug}
                      </span>
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDrawer(item); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openMergeModal(item); }}>
                          <Merge className="h-3.5 w-3.5 mr-2" />
                          Merge Into...
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && !error && (
                <tr>
                  <td colSpan={4} className="px-2 py-12 text-center text-[13px] text-gray-400">
                    No {type} found. {searchQuery ? 'Try a different search.' : `Add your first ${config.singular.toLowerCase()}!`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Drawer */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={closeDrawer}
          />
          {/* Drawer Panel */}
          <div
            className={`fixed right-3 top-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[480px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${
              showDrawer ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDrawer}
                  className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingItem ? editingItem.name || `Edit ${config.singular}` : `New ${config.singular}`}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Error in drawer */}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={labelClasses}>Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: toSlug(e.target.value) })}
                  className={inputClasses}
                  placeholder="Enter name"
                />
              </div>

              {/* Slug */}
              <div>
                <label className={labelClasses}>Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={inputClasses}
                  placeholder="auto-generated-slug"
                />
              </div>

              {/* Brand-specific fields */}
              {type === 'brands' && (
                <>
                  <div>
                    <label className={labelClasses}>Logo</label>
                    <div className="flex items-center gap-3">
                      {formData.logo_url && (
                        <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Logo</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="">Select category...</option>
                      {BRAND_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Website</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className={inputClasses}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              {/* City-specific fields */}
              {type === 'cities' && (
                <>
                  <div>
                    <label className={labelClasses}>Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={inputClasses}
                      placeholder="Country name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Region</label>
                    <input
                      type="text"
                      value={formData.region || ''}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className={inputClasses}
                      placeholder="State/Province/Region"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="City" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              {/* Country-specific fields */}
              {type === 'countries' && (
                <>
                  <div>
                    <label className={labelClasses}>Country Code (ISO)</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={inputClasses}
                      placeholder="US, GB, JP..."
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Flag Emoji</label>
                    <input
                      type="text"
                      value={formData.flag_emoji || ''}
                      onChange={(e) => setFormData({ ...formData, flag_emoji: e.target.value })}
                      className={inputClasses}
                      placeholder="🇺🇸"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Country" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Neighborhood-specific fields */}
              {type === 'neighborhoods' && (
                <>
                  <div>
                    <label className={labelClasses}>City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={inputClasses}
                      placeholder="City name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={inputClasses}
                      placeholder="Country name"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Neighborhood" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              {/* Architect-specific fields */}
              {type === 'architects' && (
                <>
                  <div>
                    <label className={labelClasses}>Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality || ''}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className={inputClasses}
                      placeholder="e.g., Japanese, Swiss, American"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Birth Year</label>
                      <input
                        type="number"
                        value={formData.birth_year || ''}
                        onChange={(e) => setFormData({ ...formData, birth_year: e.target.value })}
                        className={inputClasses}
                        placeholder="1920"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Death Year</label>
                      <input
                        type="number"
                        value={formData.death_year || ''}
                        onChange={(e) => setFormData({ ...formData, death_year: e.target.value })}
                        className={inputClasses}
                        placeholder="Leave blank if living"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Image</label>
                    <div className="flex items-center gap-3">
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Architect" className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Upload Image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Bio</label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Brief biography..."
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Design Philosophy</label>
                    <textarea
                      value={formData.design_philosophy || ''}
                      onChange={(e) => setFormData({ ...formData, design_philosophy: e.target.value })}
                      className={cn(inputClasses, "h-24 resize-none")}
                      placeholder="Key design principles and philosophy..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergeSource && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={closeMergeModal}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Merge className="h-5 w-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Merge {config.singular}
                  </h2>
                </div>
                <button
                  onClick={closeMergeModal}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Source info */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Merging:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{mergeSource.name}</p>
                  {mergePreview && (
                    <p className="text-xs text-gray-500 mt-1">
                      {mergePreview.affectedCount} destination{mergePreview.affectedCount !== 1 ? 's' : ''} will be updated
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Merge className="h-4 w-4 text-blue-600 dark:text-blue-400 rotate-90" />
                  </div>
                </div>

                {/* Target selection */}
                <div>
                  <label className={labelClasses}>Merge into:</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={mergeSearch}
                      onChange={(e) => {
                        setMergeSearch(e.target.value);
                        setMergeTarget(null);
                      }}
                      placeholder={`Search ${type}...`}
                      className={cn(inputClasses, "pl-10")}
                    />
                  </div>

                  {/* Target options */}
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                    {getMergeTargetOptions().length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No matching {type} found
                      </div>
                    ) : (
                      getMergeTargetOptions().map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setMergeTarget(item)}
                          className={cn(
                            "w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                            mergeTarget?.id === item.id && "bg-blue-50 dark:bg-blue-900/30"
                          )}
                        >
                          {('logo_url' in item && item.logo_url) || ('image_url' in item && item.image_url) ? (
                            <img
                              src={('logo_url' in item ? item.logo_url : (item as City | Country | Neighborhood).image_url) || ''}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              {type === 'countries' && 'flag_emoji' in item && item.flag_emoji ? (
                                <span className="text-lg">{item.flag_emoji}</span>
                              ) : (
                                <Icon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                            {(type === 'cities' || type === 'neighborhoods') && 'country' in item && item.country && (
                              <div className="text-xs text-gray-500 truncate">
                                {'city' in item && item.city ? `${item.city}, ` : ''}{item.country}
                              </div>
                            )}
                          </div>
                          {mergeTarget?.id === item.id && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Delete source checkbox */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={deleteAfterMerge}
                    onChange={(e) => setDeleteAfterMerge(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Delete "{mergeSource.name}" after merge
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Remove the source {config.singular.toLowerCase()} from the database
                    </p>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                <Button variant="ghost" onClick={closeMergeModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={merging || !mergeTarget}
                >
                  {merging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Merge
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
