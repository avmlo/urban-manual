'use client';

import { useState } from 'react';
import { MapPin, Navigation, Phone, ExternalLink } from 'lucide-react';
import { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';

interface LocationGroupSelectorProps {
  destinations: Destination[];
  currentDestination?: Destination;
  onSelectLocation?: (destination: Destination) => void;
  showMap?: boolean;
  className?: string;
}

/**
 * Component to display and select from multiple locations of the same POI
 * Use case: Blue Bottle Coffee with 10+ locations in San Francisco
 */
export function LocationGroupSelector({
  destinations,
  currentDestination,
  onSelectLocation,
  showMap = false,
  className,
}: LocationGroupSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentDestination?.id);

  if (destinations.length <= 1) {
    return null;
  }

  const handleSelect = (destination: Destination) => {
    setSelectedId(destination.id);
    onSelectLocation?.(destination);
  };

  // Separate primary and other locations
  const primaryLocation = destinations.find((d) => d.is_primary_location);
  const otherLocations = destinations.filter((d) => !d.is_primary_location);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {destinations.length} Location{destinations.length > 1 ? 's' : ''}
        </h3>
        {showMap && (
          <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            View on Map
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Primary Location */}
        {primaryLocation && (
          <LocationCard
            destination={primaryLocation}
            isSelected={selectedId === primaryLocation.id}
            isPrimary
            onClick={() => handleSelect(primaryLocation)}
          />
        )}

        {/* Other Locations */}
        {otherLocations.map((destination) => (
          <LocationCard
            key={destination.id}
            destination={destination}
            isSelected={selectedId === destination.id}
            onClick={() => handleSelect(destination)}
          />
        ))}
      </div>
    </div>
  );
}

interface LocationCardProps {
  destination: Destination;
  isSelected: boolean;
  isPrimary?: boolean;
  onClick: () => void;
}

function LocationCard({ destination, isSelected, isPrimary, onClick }: LocationCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border-2 transition-all hover:border-gray-400',
        isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">
                {destination.location_identifier || destination.neighborhood || 'Main Location'}
              </h4>
              {isPrimary && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                  Flagship
                </span>
              )}
            </div>
            {destination.formatted_address && (
              <p className="text-sm text-gray-600 mt-1">{destination.formatted_address}</p>
            )}
            {destination.neighborhood && destination.location_identifier !== destination.neighborhood && (
              <p className="text-sm text-gray-500 mt-0.5">{destination.neighborhood}</p>
            )}
          </div>
          <MapPin className={cn('h-5 w-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
        </div>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {destination.phone_number && (
            <a
              href={`tel:${destination.phone_number}`}
              className="flex items-center gap-1 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4" />
              {destination.phone_number}
            </a>
          )}
          {destination.google_maps_url && (
            <a
              href={destination.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="h-4 w-4" />
              Directions
            </a>
          )}
          {destination.website && (
            <a
              href={destination.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
              Website
            </a>
          )}
        </div>

        {/* Rating */}
        {destination.rating && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center">
              <span className="text-yellow-500">★</span>
              <span className="ml-1 font-medium">{destination.rating.toFixed(1)}</span>
            </div>
            {destination.user_ratings_total && (
              <span className="text-gray-500">({destination.user_ratings_total} reviews)</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
