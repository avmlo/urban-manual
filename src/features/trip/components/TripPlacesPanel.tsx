'use client';

/**
 * TripPlacesPanel - City guide view for the trip right panel
 * Shows destinations in the same grid layout as the city page,
 * with category filters and draggable cards for adding to the itinerary.
 *
 * Fetches from Supabase destinations table filtered by trip cities.
 */
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import Image from 'next/image';
import { MapPin, Check, Search, Loader2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { capitalizeCity } from '@/lib/utils';
import type { Destination } from '@/types/destination';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TripPlacesPanelProps {
  cities: string[];
  /** Slugs of destinations already in the itinerary */
  plannedSlugs: Set<string>;
  onAddPlace: (destination: Destination, dayNumber: number) => void;
  selectedDayNumber: number;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TripPlacesPanel({
  cities,
  plannedSlugs,
  onAddPlace,
  selectedDayNumber,
}: TripPlacesPanelProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showPlannedOverlay, setShowPlannedOverlay] = useState(false);

  const citiesKey = cities.join(',');

  // Fetch destinations for all trip cities (same fields as city page)
  useEffect(() => {
    if (cities.length === 0) return;
    const fetchDestinations = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('destinations')
        .select('id, slug, name, city, country, neighborhood, category, micro_description, image_thumbnail, image, rating, michelin_stars, crown')
        .in('city', cities)
        .order('name');
      setDestinations((data as Destination[]) || []);
      setIsLoading(false);
    };
    fetchDestinations();
  }, [citiesKey]);

  // Derive categories (same logic as city page: only categories with 2+ destinations)
  const categories = useMemo(() => {
    const cityFiltered = selectedCity
      ? destinations.filter(d => d.city === selectedCity)
      : destinations;
    const counts = new Map<string, number>();
    const originalCase = new Map<string, string>();
    cityFiltered.forEach(d => {
      if (d.category) {
        const lower = d.category.toLowerCase();
        if (!originalCase.has(lower)) originalCase.set(lower, d.category);
        counts.set(lower, (counts.get(lower) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .map(([lower]) => originalCase.get(lower) || lower)
      .sort((a, b) => {
        if (a.toLowerCase() === 'others') return 1;
        if (b.toLowerCase() === 'others') return -1;
        return a.localeCompare(b);
      });
  }, [destinations, selectedCity]);

  // Filter destinations
  const filtered = useMemo(() => {
    let list = destinations;
    if (selectedCity) list = list.filter(d => d.city === selectedCity);
    if (selectedCategory) {
      const cat = selectedCategory.toLowerCase();
      list = list.filter(d => d.category?.toLowerCase() === cat);
    }
    if (showPlannedOverlay) {
      list = list.filter(d => !plannedSlugs.has(d.slug));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.neighborhood?.toLowerCase().includes(q) ||
        d.micro_description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [destinations, selectedCity, selectedCategory, showPlannedOverlay, searchQuery, plannedSlugs]);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(prev => prev === cat ? '' : cat);
  }, []);

  const activeCityName = selectedCity
    ? capitalizeCity(selectedCity)
    : cities.length === 1
      ? capitalizeCity(cities[0])
      : null;

  return (
    <div className="flex flex-col h-full bg-[var(--editorial-bg)]">
      {/* City guide header - matches city page style */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        {/* City tabs (multi-city) */}
        {cities.length > 1 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
            <button
              onClick={() => { setSelectedCity(null); setSelectedCategory(''); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                !selectedCity
                  ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                  : 'text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)]'
              }`}
            >
              All Cities
            </button>
            {cities.map(city => (
              <button
                key={city}
                onClick={() => { setSelectedCity(city === selectedCity ? null : city); setSelectedCategory(''); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                  selectedCity === city
                    ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                    : 'text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)]'
                }`}
              >
                {capitalizeCity(city)}
              </button>
            ))}
          </div>
        )}

        {/* City title + count */}
        <div className="mb-4">
          {activeCityName && (
            <h2 className="text-2xl font-light text-[var(--editorial-text-primary)]">
              {activeCityName}
            </h2>
          )}
          <p className="text-xs text-[var(--editorial-text-tertiary)] mt-1">
            {filtered.length} {filtered.length === 1 ? 'destination' : 'destinations'}
            {showPlannedOverlay ? ' (unplanned)' : ''}
          </p>
        </div>

        {/* Category filters - matches city page style */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-4">
            <button
              onClick={() => setSelectedCategory('')}
              className={`transition-all duration-200 ease-out ${
                !selectedCategory
                  ? 'font-medium text-[var(--editorial-text-primary)]'
                  : 'font-medium text-[var(--editorial-text-primary)]/30 hover:text-[var(--editorial-text-primary)]/60'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`transition-all duration-200 ease-out capitalize ${
                  selectedCategory === cat
                    ? 'font-medium text-[var(--editorial-text-primary)]'
                    : 'font-medium text-[var(--editorial-text-primary)]/30 hover:text-[var(--editorial-text-primary)]/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search + unplanned filter row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl text-[var(--editorial-text-primary)] placeholder-gray-400 outline-none focus:ring-1 focus:ring-[var(--editorial-accent)]"
            />
          </div>
          <button
            onClick={() => setShowPlannedOverlay(!showPlannedOverlay)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
              showPlannedOverlay
                ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                : 'text-[var(--editorial-text-tertiary)] bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:bg-[var(--editorial-border-subtle)]'
            }`}
          >
            Unplanned
          </button>
        </div>
      </div>

      {/* Destination grid - matches city page UniversalGrid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {searchQuery ? 'No matching places' : 'No destinations found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map((destination, index) => (
              <DraggableDestinationCard
                key={destination.slug || destination.id}
                destination={destination}
                index={index}
                isPlanned={plannedSlugs.has(destination.slug)}
                selectedDayNumber={selectedDayNumber}
                onAdd={() => onAddPlace(destination, selectedDayNumber)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggableDestinationCard - City guide card with drag support
// Matches the DestinationCard from components/DestinationCard.tsx
// but wrapped with useDraggable for trip integration
// ---------------------------------------------------------------------------
const DraggableDestinationCard = memo(function DraggableDestinationCard({
  destination,
  index,
  isPlanned,
  selectedDayNumber,
  onAdd,
}: {
  destination: Destination;
  index: number;
  isPlanned: boolean;
  selectedDayNumber: number;
  onAdd: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAddFeedback, setShowAddFeedback] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guide-card-${destination.id}`,
    data: { destination, source: 'guide-panel' },
  });

  const dragStyle = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 100,
        opacity: 0.85,
      }
    : undefined;

  const hasImage = (destination.image_thumbnail || destination.image) && !imageError;

  const handleClick = () => {
    // Don't trigger if dragging
    if (transform) return;

    if (!isPlanned) {
      onAdd();
      // Show add feedback animation
      setShowAddFeedback(true);
      setTimeout(() => setShowAddFeedback(false), 1200);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`
        group relative w-full flex flex-col cursor-grab active:cursor-grabbing
        transition-all duration-300 ease-out
        ${isDragging ? 'shadow-2xl scale-105 rotate-1' : 'hover:scale-[1.01]'}
        ${isPlanned ? 'opacity-60' : ''}
      `}
    >
      {/* Image - 16:9 ratio, matching DestinationCard */}
      <div
        className={`
          relative aspect-video overflow-hidden rounded-2xl
          bg-[var(--editorial-border)]
          transition-all duration-300 ease-out
          mb-3
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${isDragging ? 'ring-2 ring-[var(--editorial-accent)] shadow-lg' : ''}
        `}
      >
        {/* Loading skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-[var(--editorial-border)]" />
        )}

        {/* Image */}
        {hasImage ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={`${destination.name}`}
            fill
            sizes="(max-width: 1280px) 50vw, 33vw"
            className={`
              object-cover
              transition-all duration-500 ease-out
              group-hover:scale-105
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            quality={80}
            loading={index < 6 ? 'eager' : 'lazy'}
            onLoad={() => setIsLoaded(true)}
            onError={() => { setImageError(true); setIsLoaded(true); }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--editorial-text-tertiary)]">
            <MapPin className="h-8 w-8 opacity-20" />
          </div>
        )}

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* "Add to Day X" overlay on hover */}
        {!isPlanned && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="px-3 py-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-xs font-medium text-[var(--editorial-text-primary)] shadow-sm">
              + Add to Day {selectedDayNumber}
            </span>
          </div>
        )}

        {/* Planned check badge - center */}
        {isPlanned && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-[var(--editorial-text-primary)] stroke-[3]" />
          </div>
        )}

        {/* Michelin stars badge */}
        {typeof destination.michelin_stars === 'number' && destination.michelin_stars > 0 && (
          <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 text-[var(--editorial-text-primary)] text-xs font-medium bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-sm">
            <img src="/michelin-star.svg" alt="Michelin star" className="h-3.5 w-3.5" />
            <span>{destination.michelin_stars}</span>
          </div>
        )}

        {/* Drag indicator on hover */}
        {!isDragging && !isPlanned && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            </div>
          </div>
        )}
      </div>

      {/* Info section - matches DestinationCard */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-[var(--editorial-text-primary)] line-clamp-2 transition-colors duration-200 group-hover:text-[var(--editorial-text-secondary)]">
          {destination.name}
        </h3>
        <div className="text-xs text-[var(--editorial-text-secondary)] line-clamp-1">
          {destination.micro_description ||
           (destination.category && destination.city
             ? `${destination.category} in ${capitalizeCity(destination.city)}`
             : destination.city
               ? `Located in ${capitalizeCity(destination.city)}`
               : destination.category || '')}
        </div>
      </div>

      {/* Add feedback animation */}
      <AnimatePresence>
        {showAddFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -8 }}
            exit={{ opacity: 0, scale: 0.8, y: -16 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold shadow-lg">
              <Check className="w-3.5 h-3.5 inline mr-1.5" />
              Added to Day {selectedDayNumber}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
