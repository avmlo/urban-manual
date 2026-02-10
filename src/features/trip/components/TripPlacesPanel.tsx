'use client';

/**
 * TripPlacesPanel - Right-side panel showing curated destinations for trip cities
 * Inspired by itskovacs/trip Places panel (MIT)
 * Fetches from Supabase destinations table filtered by trip cities
 */
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Search, Loader2, Filter } from 'lucide-react';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';

interface TripPlacesPanelProps {
  cities: string[];
  /** Slugs of destinations already in the itinerary */
  plannedSlugs: Set<string>;
  onAddPlace: (destination: Destination, dayNumber: number) => void;
  selectedDayNumber: number;
}

export default function TripPlacesPanel({
  cities,
  plannedSlugs,
  onAddPlace,
  selectedDayNumber,
}: TripPlacesPanelProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unplanned'>('all');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Stable key for cities array (avoids re-fetching on every render)
  const citiesKey = cities.join(',');

  // Fetch destinations for all trip cities
  useEffect(() => {
    if (cities.length === 0) return;
    const fetchDestinations = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('destinations')
        .select('id, slug, name, city, country, category, image_thumbnail, image, rating, micro_description, neighborhood')
        .in('city', cities)
        .order('city')
        .order('rating', { ascending: false });
      setDestinations((data as Destination[]) || []);
      setIsLoading(false);
    };
    fetchDestinations();
  }, [citiesKey]);

  // Filter destinations
  const filtered = useMemo(() => {
    let list = destinations;

    // City filter
    if (selectedCity) {
      list = list.filter(d => d.city === selectedCity);
    }

    // Planned filter
    if (filterMode === 'unplanned') {
      list = list.filter(d => !plannedSlugs.has(d.slug));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.neighborhood?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [destinations, selectedCity, filterMode, searchQuery, plannedSlugs]);

  // Count by status
  const totalCount = destinations.length;
  const unplannedCount = destinations.filter(d => !plannedSlugs.has(d.slug)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header: Manage + filter */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--editorial-border)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[var(--editorial-text-primary)]">
            Manage
          </span>
        </div>

        {/* City filter pills (if multi-city trip) */}
        {cities.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
            <button
              onClick={() => setSelectedCity(null)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                !selectedCity
                  ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                  : 'text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)]'
              }`}
            >
              All
            </button>
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city === selectedCity ? null : city)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                  selectedCity === city
                    ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                    : 'text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)]'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Filter toggle + search */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode(filterMode === 'all' ? 'unplanned' : 'all')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterMode === 'unplanned'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)]'
            }`}
          >
            <Filter className="w-3 h-3" />
            Unplanned
            {filterMode === 'unplanned' && (
              <span className="ml-0.5 text-[10px] tabular-nums">{unplannedCount}</span>
            )}
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg text-[var(--editorial-text-primary)] placeholder-gray-400 outline-none focus:ring-1 focus:ring-[var(--editorial-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Destination list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            <p className="text-xs text-gray-400 mt-2">Loading places...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {searchQuery ? 'No matching places' : `No places found for ${cities.join(', ')}`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--editorial-border)]">
            {filtered.map(destination => (
              <PlaceRow
                key={destination.id}
                destination={destination}
                isPlanned={plannedSlugs.has(destination.slug)}
                onAdd={() => onAddPlace(destination, selectedDayNumber)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-[var(--editorial-border)] text-xs text-[var(--editorial-text-tertiary)]">
        {filtered.length} of {totalCount} places
        {filterMode === 'unplanned' && ` \u00B7 ${unplannedCount} unplanned`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaceRow - Single destination row in the places panel
// ---------------------------------------------------------------------------
function PlaceRow({
  destination,
  isPlanned,
  onAdd,
}: {
  destination: Destination;
  isPlanned: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `places-panel-${destination.id}`,
    data: { destination, source: 'places-panel' },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  const hasImage = destination.image_thumbnail || destination.image;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-start gap-3 px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-[var(--editorial-border-subtle)] transition-colors ${
        isDragging ? 'z-50 shadow-lg bg-[var(--editorial-bg-elevated)]' : ''
      } ${isPlanned ? 'opacity-50' : ''}`}
    >
      {/* Image */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {hasImage ? (
          <Image
            src={destination.image_thumbnail || destination.image || ''}
            alt={destination.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">
          {destination.name}
        </p>
        <p className="text-xs text-[var(--editorial-text-tertiary)] truncate mt-0.5">
          {destination.micro_description || destination.neighborhood || destination.city}
        </p>
        <div className="mt-1.5">
          <Tag
            value={destination.category}
            severity="info"
            rounded
            className="!text-[10px] !px-2 !py-0.5"
          />
        </div>
      </div>

      {/* Add button (click to add to current day) */}
      {!isPlanned && (
        <Button
          icon="pi pi-plus"
          rounded
          text
          severity="secondary"
          className="!w-7 !h-7 flex-shrink-0 mt-1"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onAdd();
          }}
          tooltip={`Add to Day ${1}`}
          tooltipOptions={{ position: 'left' }}
        />
      )}
      {isPlanned && (
        <span className="flex-shrink-0 mt-2">
          <i className="pi pi-check text-green-500 text-xs" />
        </span>
      )}
    </div>
  );
}
