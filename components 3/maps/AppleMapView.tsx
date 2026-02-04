'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';
import {
  ensureMapkitLoaded,
  MapkitAnnotation,
  MapkitMapInstance,
  MapkitCoordinate,
} from '@/lib/maps/mapkit-loader';

interface AppleMapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  onProviderError?: (message: string) => void;
}

export default function AppleMapView({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 },
  zoom = 8,
  isDark = true,
  onProviderError,
}: AppleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapkitMapInstance | null>(null);
  const annotationsRef = useRef<MapkitAnnotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureMapkitLoaded()
      .then(() => {
        if (cancelled) return;
        setLoaded(true);
      })
      .catch(err => {
        console.error('Apple MapKit load error:', err);
        setError(err.message || 'Failed to load Apple Maps');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.mapkit) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const map = new window.mapkit!.Map(containerRef.current!, {
          colorScheme: isDark ? 'dark' : 'light',
          showsZoomControl: true,
          showsCompass: window.innerWidth >= 768,
          isRotationEnabled: false,
        });

        const selectHandler = (event: { annotation?: MapkitAnnotation }) => {
          if (event?.annotation?.data && onMarkerClick) {
            onMarkerClick(event.annotation.data as Destination);
          }
        };

        map.addEventListener('select', selectHandler);
        mapInstanceRef.current = map;

        cleanup = () => {
          map.removeEventListener('select', selectHandler);
          map.destroy?.();
          mapInstanceRef.current = null;
        };
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to initialize Apple Maps';
        console.error('Apple MapKit init error:', err);
        setError(message);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [loaded, isDark, onMarkerClick]);

  const updateAnnotations = useCallback(() => {
    if (!mapInstanceRef.current || !window.mapkit) return;

    const map = mapInstanceRef.current;
    if (annotationsRef.current.length > 0) {
      map.removeAnnotations(annotationsRef.current);
      annotationsRef.current = [];
    }

    const validDestinations = destinations.filter(dest => dest.latitude && dest.longitude);
    if (validDestinations.length === 0) {
      const spanValue = Math.max(0.02, 4 / Math.max(zoom, 1));
      map.region = new window.mapkit.CoordinateRegion(
        new window.mapkit.Coordinate(center.lat, center.lng),
        new window.mapkit.CoordinateSpan(spanValue, spanValue)
      );
      return;
    }

    annotationsRef.current = validDestinations.map(destination => {
      const coordinate = new window.mapkit!.Coordinate(destination.latitude!, destination.longitude!) as MapkitCoordinate;
      const annotation = new window.mapkit!.MarkerAnnotation(coordinate, {
        title: destination.name,
        color: '#1C1C1C',
        glyphText: destination.name?.[0]?.toUpperCase() ?? '•',
      }) as MapkitAnnotation;
      annotation.data = destination;
      return annotation;
    });

    map.addAnnotations(annotationsRef.current);
    if (annotationsRef.current.length === 1) {
      map.region = new window.mapkit!.CoordinateRegion(
        annotationsRef.current[0].coordinate,
        new window.mapkit!.CoordinateSpan(0.02, 0.02)
      );
    } else {
      map.showItems(annotationsRef.current, { animate: true });
    }
  }, [center.lat, center.lng, destinations, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return;
    let cancelled = false;

    const run = () => {
      try {
        updateAnnotations();
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to update Apple Maps';
        console.error('Apple MapKit update error:', err);
        setError(message);
      }
    };

    const frame = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [updateAnnotations]);

  useEffect(() => {
    if (error && onProviderError) {
      onProviderError(error);
    }
  }, [error, onProviderError]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center px-6">
          <p className="text-sm font-medium">Apple Maps unavailable</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
