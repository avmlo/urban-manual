'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, ArrowRight, FileEdit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
  matched_substrings?: Array<{ offset: number; length: number }>;
}

interface GooglePlaceSearchProps {
  /** Called when a place is selected and details are fetched */
  onPlaceSelected: (data: Partial<Destination> & { _googleImage?: string }) => void;
  /** Called when user wants to skip search and create manually */
  onSkip: () => void;
}

export function GooglePlaceSearch({ onPlaceSelected, onSkip }: GooglePlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate session token
  useEffect(() => {
    setSessionToken(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Auto-focus the search input
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch predictions
  useEffect(() => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          input: query,
          types: 'establishment',
          language: 'en',
        });
        if (sessionToken) params.set('sessionToken', sessionToken);

        const response = await fetch(`/api/google-places-autocomplete?${params.toString()}`);
        const data = await response.json();

        if (!data.error) {
          setPredictions(data.predictions || []);
          setSelectedIndex(-1);
          if (data.sessionToken) setSessionToken(data.sessionToken);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, sessionToken]);

  const handleSelect = async (prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.place_id);
    setFetchingDetails(true);
    setPredictions([]);

    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ placeId: prediction.place_id }),
      });

      if (!response.ok) throw new Error('Failed to fetch place details');
      const result = await response.json();
      const data = result.data || result;

      // Build destination data from Google Places response
      const destinationData: Partial<Destination> & { _googleImage?: string } = {
        name: data.name || '',
        city: data.city || '',
        category: data.category || '',
        description: data.description || '',
        content: data.content || '',
        formatted_address: data.formatted_address || data.address || '',
        phone_number: data.phone || '',
        website: data.website || '',
        rating: data.rating || null,
        price_level: data.price_level || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        place_id: data.place_id || prediction.place_id,
        editorial_summary: data.description || '',
        google_maps_url: data.latitude && data.longitude
          ? `https://www.google.com/maps/place/?q=place_id:${data.place_id || prediction.place_id}`
          : '',
      };

      // Pass image separately so the form can set both image and preview
      if (data.image) {
        destinationData._googleImage = data.image;
      }

      onPlaceSelected(destinationData);
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Still proceed with basic info from prediction
      onPlaceSelected({
        name: prediction.main_text,
        place_id: prediction.place_id,
      });
    } finally {
      setFetchingDetails(false);
      setSelectedPlaceId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          e.preventDefault();
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setPredictions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto pt-8">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-400" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-1">
            Search Google Places
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
            Find a place to auto-fill details, or create manually.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search restaurants, hotels, bars..."
              className="w-full pl-11 pr-10 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow placeholder:text-gray-400"
              disabled={fetchingDetails}
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Loading overlay when fetching details */}
          {fetchingDetails && (
            <div className="mt-6 flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Fetching place details...</p>
            </div>
          )}

          {/* Predictions List */}
          {!fetchingDetails && predictions.length > 0 && (
            <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {predictions.map((prediction, index) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handleSelect(prediction)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                    index === selectedIndex
                      ? 'bg-gray-50 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {prediction.main_text}
                    </div>
                    {prediction.secondary_text && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {prediction.secondary_text}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Empty state hint */}
          {!fetchingDetails && query.length === 0 && (
            <div className="mt-8 space-y-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium text-center">
                Try searching for
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Noma Copenhagen', 'Aman Tokyo', 'Chiltern Firehouse'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Skip option */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4">
        <button
          type="button"
          onClick={onSkip}
          disabled={fetchingDetails}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          <FileEdit className="w-4 h-4" />
          Create manually without Google Places
        </button>
      </div>
    </div>
  );
}
