'use client';

import { useEffect, useRef, useState } from 'react';
import { Destination } from '@/types/destination';

interface GoogleInteractiveMapProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export default function GoogleInteractiveMap({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 },
  zoom = 8,
  isDark = true,
}: GoogleInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not found');
      setIsLoading(false);
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoading(false);
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[data-google-maps]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setIsLoading(false);
          initializeMap();
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    setIsLoading(true);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');
    
    script.onload = () => {
      if (window.google?.maps) {
        setIsLoading(false);
        setError(null);
        initializeMap();
      }
    };

    script.onerror = () => {
      setError('Failed to load Google Maps API');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
      infoWindowsRef.current.forEach(iw => iw.close());
      infoWindowsRef.current = [];
    };
  }, []);

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        mapId: 'URBAN_MANUAL_MAP',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: isDark ? [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }]
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }]
          }
        ] : undefined,
      });

      addMarkers();
    } catch (err) {
      console.error('Error initializing Google Map:', err);
      setError('Failed to initialize map');
    }
  };

  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [center.lat, center.lng, zoom]);

  // Add markers
  const addMarkers = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const position = { lat: dest.latitude, lng: dest.longitude };
      bounds.extend(position);
      hasValidMarkers = true;

      // Create marker
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: position,
        title: dest.name || '',
      });

      // Create info window content
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
              ${dest.name || 'Destination'}
            </h3>
            ${dest.category ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">${dest.category}</p>` : ''}
            ${dest.city ? `<p style="margin: 4px 0; font-size: 12px; color: #888;">${dest.city}</p>` : ''}
            ${dest.rating ? `<div style="margin: 6px 0 0 0; font-size: 12px; color: #666;">⭐ ${dest.rating.toFixed(1)}</div>` : ''}
          </div>
        `,
      });

      // Add click listener
      marker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        
        // Open this info window
        infoWindow.open({
          anchor: marker,
          map: mapInstanceRef.current!,
        });

        // Call onMarkerClick callback
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });

    // Fit bounds if we have markers
    if (hasValidMarkers && markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      // Don't zoom in too much if only one marker
      if (markersRef.current.length === 1) {
        const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current) {
            if (mapInstanceRef.current.getZoom()! > 15) {
              mapInstanceRef.current.setZoom(15);
            }
            google.maps.event.removeListener(listener);
          }
        });
      }
    }
  };

  // Update markers when destinations change
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      addMarkers();
    }
  }, [destinations, onMarkerClick]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm font-medium">{error}</p>
          <p className="text-xs text-gray-500 mt-1">Please check your Google Maps API key configuration.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ minHeight: '600px' }}
    />
  );
}

