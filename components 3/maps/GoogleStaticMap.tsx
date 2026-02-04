'use client';

import { Destination } from '@/types/destination';

interface GoogleStaticMapProps {
  destinations?: Destination[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number | string;
  className?: string;
  query?: string;
  infoWindowContent?: {
    title?: string;
    address?: string;
    category?: string;
    rating?: number;
  };
}

export default function GoogleStaticMap({
  destinations = [],
  center,
  zoom = 12,
  height = 256,
  className = '',
  query,
  infoWindowContent,
}: GoogleStaticMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  const fallbackCoordinate = { lat: 35.6762, lng: 139.6503 };
  const destinationWithCoords = destinations.find(dest => dest.latitude && dest.longitude);
  const targetLat = destinationWithCoords?.latitude || center?.lat || fallbackCoordinate.lat;
  const targetLng = destinationWithCoords?.longitude || center?.lng || fallbackCoordinate.lng;

  if (!apiKey) {
    return (
      <div className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 ${className}`}
        style={{ height: heightStyle }}
      >
        <div className="text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300">Google Maps API key missing.</p>
          <p className="text-xs text-gray-500 mt-1">Set NEXT_PUBLIC_GOOGLE_API_KEY to enable the fallback map.</p>
        </div>
      </div>
    );
  }

  const embedUrl = destinationWithCoords || center
    ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${targetLat},${targetLng}&zoom=${Math.min(Math.max(Math.round(zoom), 3), 20)}&maptype=roadmap`
    : `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query || 'Tokyo')}`;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`} style={{ height: heightStyle }}>
      <iframe
        key={`${targetLat}-${targetLng}-${query ?? 'view'}`}
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title="Google Maps view"
      />
      {infoWindowContent && (
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-md p-3 max-w-[260px] text-xs">
          {infoWindowContent.title && <p className="text-sm font-semibold text-gray-900 dark:text-white">{infoWindowContent.title}</p>}
          {infoWindowContent.category && <p className="text-gray-600 dark:text-gray-400 mt-1">{infoWindowContent.category}</p>}
          {infoWindowContent.address && <p className="text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">{infoWindowContent.address}</p>}
          {infoWindowContent.rating && <p className="text-gray-600 dark:text-gray-400 mt-1">⭐ {infoWindowContent.rating.toFixed(1)}</p>}
        </div>
      )}
      <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-gray-900/70 text-[10px] uppercase tracking-wide px-2 py-1 rounded">
        Powered by Google Maps
      </div>
    </div>
  );
}
