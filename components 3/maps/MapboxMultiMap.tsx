'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';

interface MapboxMultiMapProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  onProviderError?: (message: string) => void;
  suppressErrorUI?: boolean;
}

export default function MapboxMultiMap({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 },
  zoom = 8,
  isDark = true,
  onProviderError,
  suppressErrorUI = false,
}: MapboxMultiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  const missingAccessToken = !accessToken;

  useEffect(() => {
    if ((error || missingAccessToken) && onProviderError) {
      onProviderError(error ?? 'Mapbox access token is not configured.');
    }
  }, [error, missingAccessToken, onProviderError]);

  useEffect(() => {
    if (missingAccessToken) {
      return;
    }

    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      const timeout = setTimeout(() => {
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          setError('Map container has no dimensions.');
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: container,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => setLoaded(true));
    map.on('error', e => {
      console.error('Mapbox error:', e);
      setError('Failed to load map.');
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [center.lat, center.lng, zoom, isDark, accessToken, missingAccessToken]);

  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidMarkers = false;

    destinations.forEach(dest => {
      if (!dest.latitude || !dest.longitude) return;

      const lng = dest.longitude;
      const lat = dest.latitude;
      bounds.extend([lng, lat]);
      hasValidMarkers = true;

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#1C1C1C';
      el.style.border = '1.5px solid #FFFFFF';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s ease';

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
            `<div style="font-weight: 500; font-size: 14px;">${dest.name}</div>`
          )
        )
        .addTo(mapRef.current!);

      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      if (window.innerWidth >= 768) {
        el.addEventListener('mouseenter', () => {
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.backgroundColor = '#FFFFFF';
          el.style.borderColor = '#1C1C1C';
        });

        el.addEventListener('mouseleave', () => {
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.backgroundColor = '#1C1C1C';
          el.style.borderColor = '#FFFFFF';
        });
      }

      markersRef.current.push(marker);
    });

    if (hasValidMarkers && markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    } else {
      mapRef.current.setCenter([center.lng, center.lat]);
      mapRef.current.setZoom(zoom);
    }
  }, [destinations, loaded, onMarkerClick, center.lat, center.lng, zoom]);

  if ((missingAccessToken || error) && !suppressErrorUI) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm mb-2">{error ?? 'Mapbox access token is not configured.'}</p>
          <p className="text-xs text-gray-500">Please configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment variables.</p>
        </div>
      </div>
    );
  }

  if (!loaded && !error && !missingAccessToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full overflow-hidden" style={{ minHeight: '400px' }} />;
}
