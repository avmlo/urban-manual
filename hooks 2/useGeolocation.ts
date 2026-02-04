'use client';

import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  accuracy: number | null;
  permissionGranted: boolean | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    accuracy: null,
    permissionGranted: null,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        permissionGranted: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permissionGranted: true,
        });

        // Store in localStorage for persistence
        localStorage.setItem('user_location', JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now(),
        }));
      },
      (error) => {
        let errorMessage = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage: 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionGranted: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Check for cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        const { lat, lng, timestamp } = JSON.parse(cached);
        // Use cached location if less than 30 minutes old
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setState({
            latitude: lat,
            longitude: lng,
            error: null,
            loading: false,
            accuracy: null,
            permissionGranted: true,
          });
        }
      } catch (e) {
        // Invalid cache, ignore
      }
    }
  }, []);

  return {
    ...state,
    requestLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
