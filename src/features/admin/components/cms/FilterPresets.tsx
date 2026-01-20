'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Save, BookmarkCheck, Trash2, Star } from 'lucide-react';

interface FilterState {
  city?: string;
  category?: string;
  enriched?: 'all' | 'enriched' | 'not_enriched';
  missingData?: 'all' | 'no_image' | 'no_description' | 'no_content';
  crown?: boolean;
  michelin?: boolean;
  status?: 'all' | 'draft' | 'published' | 'archived';
  search?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
  createdAt: string;
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'needs-enrichment',
    name: 'Needs Enrichment',
    filters: { enriched: 'not_enriched' },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'missing-images',
    name: 'Missing Images',
    filters: { missingData: 'no_image' },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'crown-picks',
    name: 'Crown Picks',
    filters: { crown: true },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'michelin-starred',
    name: 'Michelin Starred',
    filters: { michelin: true },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'draft-destinations',
    name: 'Draft Destinations',
    filters: { status: 'draft' },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

const STORAGE_KEY = 'admin-filter-presets';

interface FilterPresetsProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState) => void;
}

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const customPresets = JSON.parse(saved) as FilterPreset[];
        setPresets([...DEFAULT_PRESETS, ...customPresets]);
      } catch (error) {
        console.error('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Save custom presets to localStorage
  const saveCustomPresets = (customPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a name for this preset');
      return;
    }

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: presetName.trim(),
      filters: currentFilters,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    const customPresets = presets.filter((p) => !p.isDefault);
    const updatedCustomPresets = [...customPresets, newPreset];

    setPresets([...DEFAULT_PRESETS, ...updatedCustomPresets]);
    saveCustomPresets(updatedCustomPresets);

    setSaveDialogOpen(false);
    setPresetName('');
  };

  const handleDeletePreset = (id: string) => {
    const customPresets = presets.filter((p) => !p.isDefault && p.id !== id);
    setPresets([...DEFAULT_PRESETS, ...customPresets]);
    saveCustomPresets(customPresets);
  };

  const getFilterDescription = (filters: FilterState): string => {
    const parts: string[] = [];

    if (filters.city) parts.push(filters.city);
    if (filters.category) parts.push(filters.category);
    if (filters.enriched === 'enriched') parts.push('Enriched');
    if (filters.enriched === 'not_enriched') parts.push('Not enriched');
    if (filters.missingData === 'no_image') parts.push('No image');
    if (filters.missingData === 'no_description') parts.push('No description');
    if (filters.crown) parts.push('Crown');
    if (filters.michelin) parts.push('Michelin');
    if (filters.status && filters.status !== 'all') parts.push(filters.status);

    return parts.length > 0 ? parts.join(' • ') : 'All destinations';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookmarkCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Filter Presets</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">Quick Filters</p>
          </div>

          {DEFAULT_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => onApplyPreset(preset.filters)}
              className="flex items-start gap-2 cursor-pointer"
            >
              <Star className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {getFilterDescription(preset.filters)}
                </div>
              </div>
            </DropdownMenuItem>
          ))}

          {presets.filter((p) => !p.isDefault).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Custom Presets</p>
              </div>
              {presets
                .filter((p) => !p.isDefault)
                .map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-start gap-2 cursor-pointer group"
                    asChild
                  >
                    <div>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => onApplyPreset(preset.filters)}
                      >
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {getFilterDescription(preset.filters)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePreset(preset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </DropdownMenuItem>
                ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)} className="gap-2">
            <Save className="w-4 h-4" />
            <span>Save Current Filters</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filter configuration for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="preset-name" className="text-sm font-medium mb-2 block">
                Preset Name
              </label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Paris Restaurants"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePreset();
                  }
                }}
              />
            </div>

            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-xs font-medium mb-2">Current Filters</p>
              <p className="text-xs text-muted-foreground">
                {getFilterDescription(currentFilters)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>Save Preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
