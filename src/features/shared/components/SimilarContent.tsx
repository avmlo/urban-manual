'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Sparkles,
  Star,
  ChevronRight,
  Loader2,
  Grid3X3,
  List,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCategory } from '@/lib/utils';

interface SimilarContentProps {
  destination: Destination;
  onSelectDestination: (destination: Destination) => void;
  onAddToTrip?: (destination: Destination) => void;
}

/**
 * SimilarContent - Intelligent similar places discovery
 *
 * Shows similar destinations based on:
 * - Category match
 * - Location proximity
 * - Style/vibe similarity
 * - User preferences
 *
 * Features grid and list view modes.
 */
const SimilarContent = memo(function SimilarContent({
  destination,
  onSelectDestination,
  onAddToTrip,
}: SimilarContentProps) {
  const [similar, setSimilar] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filter, setFilter] = useState<'all' | 'nearby' | 'style'>('all');

  // Fetch similar destinations
  useEffect(() => {
    const fetchSimilar = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/intelligence/similar?slug=${destination.slug}&limit=12&filter=${filter}`
        );
        if (response.ok) {
          const data = await response.json();
          setSimilar(data.similar || []);
        }
      } catch (error) {
        console.error('Failed to fetch similar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilar();
  }, [destination.slug, filter]);

  // Filter options
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'nearby', label: 'Nearby' },
    { key: 'style', label: 'Similar Style' },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500">Finding similar places...</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Places like {destination.name}
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          {similar.length} similar {similar.length === 1 ? 'place' : 'places'} found
        </p>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${filter === f.key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
            }`}
          >
            <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''
            }`}
          >
            <Grid3X3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Results */}
      {similar.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No similar places found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {similar.map((dest) => (
            <GridCard
              key={dest.slug}
              destination={dest}
              onClick={() => onSelectDestination(dest)}
              onAddToTrip={onAddToTrip ? () => onAddToTrip(dest) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {similar.map((dest) => (
            <ListCard
              key={dest.slug}
              destination={dest}
              onClick={() => onSelectDestination(dest)}
              onAddToTrip={onAddToTrip ? () => onAddToTrip(dest) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Grid card for similar destination
 */
function GridCard({
  destination,
  onClick,
  onAddToTrip,
}: {
  destination: Destination;
  onClick: () => void;
  onAddToTrip?: () => void;
}) {
  const imageUrl = destination.image || destination.image_thumbnail;

  return (
    <button
      onClick={onClick}
      className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 text-left"
    >
      <div className="aspect-square">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-medium text-white truncate">
          {destination.name}
        </p>
        <p className="text-xs text-white/70 truncate">
          {capitalizeCategory(destination.category || '')}
        </p>
      </div>
      {destination.rating && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
          <img src="/google-logo.svg" alt="Google" className="w-3 h-3" />
          <span className="text-xs font-medium text-white">
            {destination.rating.toFixed(1)}
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * List card for similar destination
 */
function ListCard({
  destination,
  onClick,
  onAddToTrip,
}: {
  destination: Destination;
  onClick: () => void;
  onAddToTrip?: () => void;
}) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
    >
      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {destination.name}
          </p>
          {destination.rating && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <img src="/google-logo.svg" alt="Google" className="w-3 h-3" />
              <span className="text-xs text-gray-500">
                {destination.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {capitalizeCategory(destination.category || '')}
          {destination.neighborhood && ` · ${destination.neighborhood}`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default SimilarContent;
