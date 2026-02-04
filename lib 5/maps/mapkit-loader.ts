let loaderPromise: Promise<void> | null = null;
let initialized = false;

export interface MapkitCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapkitCoordinateSpan {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapkitCoordinateRegion {
  center?: MapkitCoordinate;
  span?: MapkitCoordinateSpan;
}

export interface MapkitAnnotation {
  coordinate: MapkitCoordinate;
  data?: unknown;
}

export interface MapkitMapInstance {
  addEventListener: (name: string, handler: (event: { annotation?: MapkitAnnotation }) => void) => void;
  removeEventListener: (name: string, handler: (event: { annotation?: MapkitAnnotation }) => void) => void;
  addAnnotations: (annotations: MapkitAnnotation[]) => void;
  removeAnnotations: (annotations: MapkitAnnotation[]) => void;
  showItems: (annotations: MapkitAnnotation[], options?: { animate?: boolean }) => void;
  addAnnotation?: (annotation: MapkitAnnotation) => void;
  destroy?: () => void;
  region: MapkitCoordinateRegion;
}

export interface MapkitGeocoderResult {
  name?: string;
  coordinate: MapkitCoordinate;
}

export interface MapkitGeocoder {
  lookup: (query: string, callback: (results: MapkitGeocoderResult[], error?: Error) => void) => void;
}

export interface MapkitGlobal {
  loaded: boolean;
  language?: string;
  init: (options: { authorizationCallback: (done: (token: string) => void) => void }) => void;
  Map: new (element: HTMLElement, options?: Record<string, unknown>) => MapkitMapInstance;
  MarkerAnnotation: new (coordinate: MapkitCoordinate, options?: Record<string, unknown>) => MapkitAnnotation;
  Coordinate: new (latitude: number, longitude: number) => MapkitCoordinate;
  CoordinateSpan: new (latitudeDelta: number, longitudeDelta: number) => MapkitCoordinateSpan;
  CoordinateRegion: new (coordinate: MapkitCoordinate, span: MapkitCoordinateSpan) => MapkitCoordinateRegion;
  Geocoder: new () => MapkitGeocoder;
}

declare global {
  interface Window {
    mapkit?: MapkitGlobal;
  }
}

function fetchAuthorizationToken(done: (token: string) => void) {
  // Create abort controller for timeout (with fallback for older browsers)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  fetch('/api/mapkit-token', { 
    credentials: 'same-origin',
    signal: controller.signal
  })
    .then(res => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      if (!data.token) {
        throw new Error('No token received from server');
      }
      done(data.token);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('MapKit authorization error: Request timeout');
      } else {
        console.error('MapKit authorization error:', error);
      }
      // Pass empty token but log the error - MapKit will handle the failure
      done('');
    });
}

function waitForMapkitReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('MapKit is only available in the browser'));
      return;
    }

    // Increased timeout to 15 seconds to account for slow networks and authorization
    const timeout = window.setTimeout(() => {
      reject(new Error('MapKit initialization timeout - the authorization token may be invalid or the network is slow'));
    }, 15000);

    let attempts = 0;
    const maxAttempts = 300; // 15 seconds at ~50ms per check

    const checkLoaded = () => {
      attempts++;
      
      // Check if MapKit is loaded and initialized
      if (window.mapkit?.loaded) {
        window.clearTimeout(timeout);
        resolve();
        return;
      }

      // If we've exceeded max attempts, reject
      if (attempts >= maxAttempts) {
        window.clearTimeout(timeout);
        reject(new Error('MapKit initialization timeout - exceeded maximum attempts'));
        return;
      }

      // Continue checking
      window.requestAnimationFrame(checkLoaded);
    };

    // Start checking after a small delay to allow init to complete
    window.setTimeout(() => {
      checkLoaded();
    }, 100);
  });
}

export function ensureMapkitLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapKit is only available in the browser'));
  }

  if (window.mapkit?.loaded) {
    return Promise.resolve();
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    const handleReady = () => {
      if (!window.mapkit) {
        reject(new Error('MapKit did not load correctly'));
        return;
      }

      if (!initialized) {
        try {
          window.mapkit.init({
            authorizationCallback: fetchAuthorizationToken,
          });
          window.mapkit.language = navigator.language || 'en-US';
          initialized = true;
        } catch (error) {
          console.error('MapKit init error:', error);
          reject(error as Error);
          return;
        }
      }

      // Wait for MapKit to be ready, with better error handling
      waitForMapkitReady()
        .then(() => {
          // Double-check that MapKit is actually ready
          if (!window.mapkit?.loaded) {
            reject(new Error('MapKit loaded property is false after initialization'));
            return;
          }
          resolve();
        })
        .catch((error) => {
          console.error('MapKit ready check failed:', error);
          reject(error);
        });
    };

    const handleError = () => {
      reject(new Error('Failed to load MapKit JS'));
    };

    if (document.querySelector('script[data-mapkit-loader="true"]')) {
      const existing = document.querySelector('script[data-mapkit-loader="true"]')!;
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    script.dataset.mapkitLoader = 'true';
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  })
    .catch(error => {
      loaderPromise = null;
      throw error;
    });

  return loaderPromise;
}
