'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { Loader2, AlertCircle, List, X, ChevronRight, MapPin } from 'lucide-react';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import {
  MapkitCoordinate,
  MapkitAnnotation,
  MapkitMapInstance,
  ensureMapkitLoaded,
} from '@/lib/maps/mapkit-loader';

/**
 * Apple Maps View - Built from Scratch
 *
 * Clean MapKit JS integration with:
 * - Interactive map with Apple design
 * - Custom styled markers
 * - Marker clustering for performance
 * - Split-pane with scrollable list
 * - Click marker → open drawer
 */

// Extended annotation with destination data
interface DestinationAnnotation extends MapkitAnnotation {
  data?: Destination;
}

export function AppleMapView() {
  const {
    filteredDestinations,
    openDestination,
    selectedDestination,
    isDrawerOpen,
    setViewMode,
  } = useHomepageData();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapkitMapInstance | null>(null);
  const annotationsRef = useRef<DestinationAnnotation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Filter destinations with coordinates
  const mappableDestinations = filteredDestinations.filter(
    d => typeof d.latitude === 'number' && typeof d.longitude === 'number'
  );

  // Create the map
  const createMap = useCallback(() => {
    if (!mapContainerRef.current || !window.mapkit) return;

    try {
      // Create initial center (Asia-Pacific as default view)
      const center = new window.mapkit.Coordinate(25.0330, 121.5654); // Taipei
      const span = new window.mapkit.CoordinateSpan(80, 120); // Wide view covering Asia
      const region = new window.mapkit.CoordinateRegion(center, span);

      // MapKit colorScheme/mapType use string values at runtime
      // See: https://developer.apple.com/documentation/mapkitjs/map
      const map = new window.mapkit.Map(mapContainerRef.current, {
        showsCompass: true,
        showsZoomControl: true,
        showsMapTypeControl: false,
        isScrollEnabled: true,
        isZoomEnabled: true,
        colorScheme: 'dark',
        mapType: 'standard',
        region: region,
        loadPriority: 'landCover',
      });

      mapRef.current = map;

      // Trigger resize and re-set region after creation to ensure tiles load
      setTimeout(() => {
        if (mapContainerRef.current) {
          window.dispatchEvent(new Event('resize'));
        }

        // Re-set the region to trigger tile loading
        if (window.mapkit) {
          try {
            const newCenter = new window.mapkit.Coordinate(25.0330, 121.5654);
            const newSpan = new window.mapkit.CoordinateSpan(80, 120);
            const newRegion = new window.mapkit.CoordinateRegion(newCenter, newSpan);
            map.region = newRegion;
          } catch {
            // Region reset failed - tiles may load on next interaction
          }
        }
      }, 1000);

      // Handle marker selection
      map.addEventListener('select', (event) => {
        if (event.annotation?.data) {
          openDestination(event.annotation.data as Destination);
        }
      });
    } catch (err) {
      console.error('[AppleMapView] Map creation error:', err);
      throw err;
    }
  }, [openDestination]);

  // Update markers
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !window.mapkit) {
      return;
    }

    const map = mapRef.current;

    // Clear existing
    if (annotationsRef.current.length > 0) {
      map.removeAnnotations(annotationsRef.current);
      annotationsRef.current = [];
    }

    // Create new annotations
    const annotations: DestinationAnnotation[] = [];

    mappableDestinations.forEach((dest) => {
      const coord = new window.mapkit!.Coordinate(dest.latitude!, dest.longitude!);

      const isSelected = selectedDestination?.slug === dest.slug;
      const isHovered = hoveredSlug === dest.slug;

      const annotation = new window.mapkit!.MarkerAnnotation(coord, {
        title: dest.name,
        subtitle: dest.category || '',
        color: isSelected ? '#007AFF' : isHovered ? '#5856D6' : '#1C1C1E',
        glyphColor: '#FFFFFF',
        data: dest,
        clusteringIdentifier: 'destinations',
      }) as DestinationAnnotation;

      annotations.push(annotation);
    });

    if (annotations.length > 0) {
      map.addAnnotations(annotations);
      annotationsRef.current = annotations;

      // Fit to show all markers
      map.showItems(annotations, { animate: true });
    }
  }, [mappableDestinations, selectedDestination, hoveredSlug]);

  // Initialize everything
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        // Use the shared MapKit loader
        await ensureMapkitLoaded();

        if (!mounted) return;

        createMap();
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Map init error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (mapRef.current?.destroy) {
        mapRef.current.destroy();
      }
    };
  }, [createMap]);

  // Update markers when data changes
  useEffect(() => {
    if (!isLoading && !error && mapRef.current) {
      updateMarkers();
    }
  }, [isLoading, error, updateMarkers]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] rounded-lg bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading Apple Maps...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    const isCredentialError = error.includes('timeout') || error.includes('authorization');
    return (
      <div className="w-full h-[70vh] rounded-lg bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              {isCredentialError ? 'Map configuration required' : 'Map unavailable'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              {isCredentialError
                ? 'Apple Maps requires MapKit credentials to be configured. Switch to grid view to browse destinations.'
                : error}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className="px-5 py-2.5 text-sm font-medium rounded-full
                         bg-gray-900 dark:bg-white text-white dark:text-gray-900
                         hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Switch to Grid
            </button>
            {!isCredentialError && (
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-sm font-medium rounded-full
                           border border-gray-300 dark:border-white/20
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[70vh] rounded-lg overflow-hidden bg-[#1c1c1e]">
      <div className="flex h-full">
        {/* Map */}
        <div
          ref={mapContainerRef}
          className={`h-full transition-all duration-300 ${
            showList && !isDrawerOpen ? 'w-2/3' : 'w-full'
          }`}
        />

        {/* Side List Panel */}
        {showList && !isDrawerOpen && (
          <div className="w-1/3 h-full bg-white dark:bg-[#1c1c1e] border-l border-gray-200 dark:border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    On this map
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mappableDestinations.length} destinations
                  </p>
                </div>
                <button
                  onClick={() => setShowList(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10
                             flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {mappableDestinations.slice(0, 100).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => openDestination(dest)}
                  onMouseEnter={() => setHoveredSlug(dest.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                             border-b border-gray-50 dark:border-white/5
                             hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                               selectedDestination?.slug === dest.slug
                                 ? 'bg-blue-50 dark:bg-blue-900/20'
                                 : ''
                             }`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {(dest.image_thumbnail || dest.image) ? (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        width={48}
                        height={48}
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
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {dest.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {dest.category && capitalizeCategory(dest.category)}
                      {dest.category && dest.city && ' · '}
                      {dest.city && capitalizeCity(dest.city)}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toggle List Button */}
      {!showList && (
        <button
          onClick={() => setShowList(true)}
          className="absolute top-4 right-4 px-4 py-2 rounded-full
                     bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-lg
                     flex items-center gap-2
                     hover:bg-white dark:hover:bg-black/90 transition-colors"
        >
          <List className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Show list
          </span>
        </button>
      )}

      {/* Location count badge */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full
                      bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-lg
                      text-sm font-medium text-gray-700 dark:text-gray-200">
        {mappableDestinations.length} locations
      </div>
    </div>
  );
}

export default AppleMapView;
