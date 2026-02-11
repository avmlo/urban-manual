'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Grid3x3,
  Map,
  Search,
  Sparkles,
  TrendingUp,
  Save,
  RotateCcw,
  Settings
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';

interface HomepageConfig {
  hero: {
    showGreeting: boolean;
    showSearch: boolean;
    showFilters: boolean;
  };
  layout: {
    defaultView: 'grid' | 'map';
    showViewToggle: boolean;
    gridColumns: number;
    showMapOption: boolean;
  };
  sections: {
    showTrending: boolean;
    showRecommendations: boolean;
    showSmartSuggestions: boolean;
    showCollections: boolean;
  };
  navigation: {
    showCityPills: boolean;
    showCategoryPills: boolean;
    showQuickActions: boolean;
  };
}

const DEFAULT_CONFIG: HomepageConfig = {
  hero: {
    showGreeting: true,
    showSearch: true,
    showFilters: true,
  },
  layout: {
    defaultView: 'grid',
    showViewToggle: true,
    gridColumns: 3,
    showMapOption: true,
  },
  sections: {
    showTrending: true,
    showRecommendations: true,
    showSmartSuggestions: true,
    showCollections: false,
  },
  navigation: {
    showCityPills: true,
    showCategoryPills: true,
    showQuickActions: true,
  },
};

export function HomepageVisualEditor() {
  const toast = useToast();
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config from database
  const loadConfig = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('homepage_config')
        .select('config')
        .eq('id', 'main')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (data?.config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load homepage config:', error);
      toast.error('Failed to load homepage configuration');
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('homepage_config')
        .upsert({
          id: 'main',
          config,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setHasChanges(false);
      toast.success('Homepage configuration saved');
    } catch (error) {
      console.error('Failed to save homepage config:', error);
      toast.error('Failed to save homepage configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  const updateConfig = <K extends keyof HomepageConfig>(
    section: K,
    key: keyof HomepageConfig[K],
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-[var(--editorial-text-secondary)]">
        Loading homepage configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--editorial-text-primary)] flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Homepage Visual Editor
          </h2>
          <p className="text-sm text-[var(--editorial-text-secondary)] mt-1">
            Configure homepage sections and layout visually
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetConfig}
            className="px-4 py-2 text-sm font-medium text-[var(--editorial-text-primary)] bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg hover:bg-[var(--editorial-border-subtle)] transition-colors flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={saveConfig}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 text-sm font-medium text-[var(--editorial-bg)] bg-[var(--editorial-text-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="border border-[var(--editorial-border)] rounded-xl p-6 bg-[var(--editorial-bg-elevated)]">
        <h3 className="text-lg font-semibold mb-4 text-[var(--editorial-text-primary)] flex items-center gap-2">
          <Search className="h-4 w-4" />
          Hero Section
        </h3>
        <div className="space-y-4">
          <ToggleOption
            label="Show Greeting"
            description="Display personalized greeting for logged-in users"
            enabled={config.hero.showGreeting}
            onChange={(enabled) => updateConfig('hero', 'showGreeting', enabled)}
          />
          <ToggleOption
            label="Show Search Bar"
            description="Display main search input"
            enabled={config.hero.showSearch}
            onChange={(enabled) => updateConfig('hero', 'showSearch', enabled)}
          />
          <ToggleOption
            label="Show Filters"
            description="Display filter panel"
            enabled={config.hero.showFilters}
            onChange={(enabled) => updateConfig('hero', 'showFilters', enabled)}
          />
        </div>
      </div>

      {/* Layout Section */}
      <div className="border border-[var(--editorial-border)] rounded-xl p-6 bg-[var(--editorial-bg-elevated)]">
        <h3 className="text-lg font-semibold mb-4 text-[var(--editorial-text-primary)] flex items-center gap-2">
          <Grid3x3 className="h-4 w-4" />
          Layout Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--editorial-text-primary)] mb-2">
              Default View
            </label>
            <select
              value={config.layout.defaultView}
              onChange={(e) => updateConfig('layout', 'defaultView', e.target.value as 'grid' | 'map')}
              className="w-full px-3 py-2 text-sm border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-primary)]"
            >
              <option value="grid">Grid</option>
              <option value="map">Map</option>
            </select>
          </div>
          <ToggleOption
            label="Show View Toggle"
            description="Allow users to switch between grid and map views"
            enabled={config.layout.showViewToggle}
            onChange={(enabled) => updateConfig('layout', 'showViewToggle', enabled)}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--editorial-text-primary)] mb-2">
              Grid Columns
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={config.layout.gridColumns}
              onChange={(e) => updateConfig('layout', 'gridColumns', parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-primary)]"
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="border border-[var(--editorial-border)] rounded-xl p-6 bg-[var(--editorial-bg-elevated)]">
        <h3 className="text-lg font-semibold mb-4 text-[var(--editorial-text-primary)] flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Homepage Sections
        </h3>
        <div className="space-y-4">
          <ToggleOption
            label="Trending Section"
            description="Show trending destinations"
            enabled={config.sections.showTrending}
            onChange={(enabled) => updateConfig('sections', 'showTrending', enabled)}
            icon={TrendingUp}
          />
          <ToggleOption
            label="Recommendations"
            description="Show personalized recommendations"
            enabled={config.sections.showRecommendations}
            onChange={(enabled) => updateConfig('sections', 'showRecommendations', enabled)}
            icon={Sparkles}
          />
          <ToggleOption
            label="Smart Suggestions"
            description="Show AI-powered suggestions"
            enabled={config.sections.showSmartSuggestions}
            onChange={(enabled) => updateConfig('sections', 'showSmartSuggestions', enabled)}
            icon={Sparkles}
          />
          <ToggleOption
            label="Collections"
            description="Show user collections"
            enabled={config.sections.showCollections}
            onChange={(enabled) => updateConfig('sections', 'showCollections', enabled)}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="border border-[var(--editorial-border)] rounded-xl p-6 bg-[var(--editorial-bg-elevated)]">
        <h3 className="text-lg font-semibold mb-4 text-[var(--editorial-text-primary)] flex items-center gap-2">
          <Map className="h-4 w-4" />
          Navigation Elements
        </h3>
        <div className="space-y-4">
          <ToggleOption
            label="City Pills"
            description="Show city filter pills"
            enabled={config.navigation.showCityPills}
            onChange={(enabled) => updateConfig('navigation', 'showCityPills', enabled)}
          />
          <ToggleOption
            label="Category Pills"
            description="Show category filter pills"
            enabled={config.navigation.showCategoryPills}
            onChange={(enabled) => updateConfig('navigation', 'showCategoryPills', enabled)}
          />
          <ToggleOption
            label="Quick Actions"
            description="Show quick action buttons"
            enabled={config.navigation.showQuickActions}
            onChange={(enabled) => updateConfig('navigation', 'showQuickActions', enabled)}
          />
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            You have unsaved changes. Don't forget to save!
          </p>
        </div>
      )}
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
}

function ToggleOption({ label, description, enabled, onChange, icon: Icon }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between p-4 border border-[var(--editorial-border)] rounded-lg hover:bg-[var(--editorial-bg)] transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="h-4 w-4 text-[var(--editorial-text-secondary)]" />}
          <label className="text-sm font-medium text-[var(--editorial-text-primary)] cursor-pointer">
            {label}
          </label>
        </div>
        <p className="text-xs text-[var(--editorial-text-secondary)]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--editorial-text-secondary)] focus:ring-offset-2 ${
          enabled ? 'bg-[var(--editorial-text-primary)]' : 'bg-[var(--editorial-border)]'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

