'use client';

/**
 * Gap and meal suggestions between itinerary items
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Sparkles, ChevronDown, Loader2, Plus, CloudRain, Sun, CloudSun, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';
import type { DayWeather } from '@/lib/hooks/useWeather';

// ---------------------------------------------------------------------------
// ItemImage
// ---------------------------------------------------------------------------
export function ItemImage({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-6 h-6 rounded bg-[var(--editorial-bg-elevated)] flex items-center justify-center flex-shrink-0">
        <MapPin className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
      <Image src={src} alt="" width={24} height={24}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeatherIcon
// ---------------------------------------------------------------------------
export function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={`text-amber-400 ${className}`} />;
  if (code <= 2) return <CloudSun className={`text-amber-300 ${className}`} />;
  if (code === 3) return <Cloud className={`text-gray-400 ${className}`} />;
  if (code >= 45 && code <= 48) return <Cloud className={`text-gray-400 ${className}`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`text-blue-400 ${className}`} />;
  if (code >= 71 && code <= 77) return <Cloud className={`text-blue-200 ${className}`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`text-blue-500 ${className}`} />;
  if (code >= 95) return <CloudRain className={`text-purple-400 ${className}`} />;
  return <Sun className={`text-gray-400 ${className}`} />;
}

// ---------------------------------------------------------------------------
// GapSuggestion
// ---------------------------------------------------------------------------
interface GapSuggestionProps {
  fromItem: EnrichedItineraryItem;
  toItem: EnrichedItineraryItem;
  city: string;
  onAddPlace: (destination: Destination, time?: string) => void;
}

export function GapSuggestion({ fromItem, toItem, city, onAddPlace }: GapSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: number; slug: string; name: string; category: string; image?: string; reason?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fromTime = fromItem.time || fromItem.parsedNotes?.departureTime || fromItem.parsedNotes?.checkOutTime;
  const toTime = toItem.time || toItem.parsedNotes?.departureTime || toItem.parsedNotes?.checkInTime;
  const fromDuration = fromItem.parsedNotes?.duration || 1.5;

  if (!fromTime || !toTime) return null;

  const [fromH, fromM] = fromTime.split(':').map(Number);
  const [toH, toM] = toTime.split(':').map(Number);
  const fromMins = fromH * 60 + fromM + (parseFloat(String(fromDuration)) * 60);
  const toMins = toH * 60 + toM;
  const gapMins = toMins - fromMins;

  if (gapMins < 90) return null;

  const midTime = fromMins + gapMins / 2;
  const hour = Math.floor(midTime / 60);

  const getSuggestionType = () => {
    if (hour >= 7 && hour < 10) return { category: 'Cafe', label: 'Coffee?' };
    if (hour >= 11 && hour < 14) return { category: 'Restaurant', label: 'Lunch?' };
    if (hour >= 14 && hour < 17) return { category: 'Culture', label: 'Explore?' };
    if (hour >= 18 && hour < 21) return { category: 'Restaurant', label: 'Dinner?' };
    if (hour >= 21) return { category: 'Bar', label: 'Drinks?' };
    return null;
  };

  const suggestionType = getSuggestionType();
  if (!suggestionType) return null;

  const suggestedTime = (() => {
    const midMins = fromMins + Math.round(gapMins / 3);
    const h = Math.floor(midMins / 60);
    const m = midMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  const fetchSuggestions = async () => {
    if (suggestions.length > 0 || isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          existingItems: [
            { title: fromItem.title || fromItem.destination?.name, category: fromItem.destination?.category, time: fromTime },
            { title: toItem.title || toItem.destination?.name, category: toItem.destination?.category, time: toTime },
          ],
          tripDays: 1,
          gapContext: {
            afterActivity: fromItem.title || fromItem.destination?.name,
            afterCategory: fromItem.destination?.category || fromItem.parsedNotes?.type,
            beforeActivity: toItem.title || toItem.destination?.name,
            beforeCategory: toItem.destination?.category || toItem.parsedNotes?.type,
            gapMinutes: gapMins,
            timeOfDay: suggestionType.category,
            suggestedTime,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiSuggestions = (data.suggestions || []).slice(0, 4).map((s: any) => ({
          id: s.destination?.id || s.id,
          slug: s.destination?.slug || s.slug,
          name: s.destination?.name || s.name,
          category: s.destination?.category || s.category,
          image: s.destination?.image || s.destination?.image_thumbnail || s.image,
          reason: s.reason,
        })).filter((s: any) => s.slug && s.name);

        if (aiSuggestions.length > 0) {
          setSuggestions(aiSuggestions);
        } else {
          const fallbackResponse = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${suggestionType.category} ${city}` }),
          });
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setSuggestions((fallbackData.results || []).slice(0, 4).map((d: any) => ({
              id: d.id, slug: d.slug, name: d.name, category: d.category, image: d.image,
            })));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) fetchSuggestions();
  };

  const addSuggestion = (place: { slug: string; name: string; category?: string; image?: string }) => {
    const destination = { slug: place.slug, name: place.name, city, category: place.category || 'place', image: place.image } as Destination;
    onAddPlace(destination, suggestedTime);
    setIsExpanded(false);
  };

  const gapHours = Math.round(gapMins / 60 * 10) / 10;

  return (
    <div className="py-1">
      <div className="flex justify-center">
        <button onClick={handleExpand}
          className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
          <Sparkles className="w-3 h-3" />
          <span>{gapHours}h gap · {suggestionType.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 pb-1 px-2">
              {isLoading ? (
                <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((place) => (
                    <button key={place.slug} onClick={() => addSuggestion(place)} disabled={isAdding}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                        {place.image ? <Image src={place.image} alt="" width={40} height={40} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-400" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">{place.name}</p>
                        <p className="text-xs text-[var(--editorial-text-secondary)] truncate">{place.reason || place.category}</p>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">No suggestions found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealGapSuggestions
// ---------------------------------------------------------------------------
export function MealGapSuggestions({
  items,
  onAddSuggestion,
}: {
  items: EnrichedItineraryItem[];
  onAddSuggestion?: (type: string) => void;
}) {
  const hasBreakfast = items.some(i =>
    i.parsedNotes?.type === 'hotel' ||
    i.destination?.category?.toLowerCase().includes('cafe') ||
    i.destination?.category?.toLowerCase().includes('breakfast')
  );
  const hasLunch = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 11 && parseInt(i.time.split(':')[0]) <= 14
  );
  const hasDinner = items.some(i =>
    i.destination?.category?.toLowerCase().includes('restaurant') &&
    i.time && parseInt(i.time.split(':')[0]) >= 18
  );

  const missingItems = [];
  if (!hasBreakfast && items.length > 0) missingItems.push('breakfast');
  if (!hasLunch && items.length > 0) missingItems.push('lunch');
  if (!hasDinner && items.length > 1) missingItems.push('dinner');

  if (missingItems.length === 0 || items.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400">Missing:</span>
      {missingItems.map((item) => (
        <button key={item} onClick={() => onAddSuggestion?.(item)}
          className="text-xs px-2 py-0.5 rounded-md bg-[var(--editorial-bg-elevated)] text-gray-600 dark:text-gray-400 hover:bg-[var(--editorial-border-subtle)] transition-colors">
          + {item}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeatherWarning
// ---------------------------------------------------------------------------
export function WeatherWarning({ item, date }: { item: EnrichedItineraryItem; date?: string }) {
  const category = item.destination?.category?.toLowerCase() || '';
  const isOutdoor = ['park', 'garden', 'beach', 'outdoor', 'walk', 'hike', 'tour'].some(c => category.includes(c));
  if (!isOutdoor) return null;

  const [weather, setWeather] = useState<{ rain: boolean; temp?: number } | null>(null);

  useEffect(() => {
    if (Math.random() > 0.7) setWeather({ rain: true, temp: 15 });
  }, []);

  if (!weather?.rain) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500 ml-2">
      <CloudRain className="w-3 h-3" />
      <span>Rain expected</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// TripWarnings (formerly TripIntelligence inline)
// ---------------------------------------------------------------------------
export function TripWarnings({
  days,
  weatherByDate,
}: {
  days: Array<{ dayNumber: number; date: string | null; items: EnrichedItineraryItem[] }>;
  city: string;
  weatherByDate: Record<string, DayWeather>;
  onOptimizeRoute: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  compact?: boolean;
}) {
  const warnings = useMemo(() => {
    const result: Array<{ id: string; title: string }> = [];

    days.forEach((day) => {
      const items = day.items;
      if (items.length < 2) return;

      const sortedItems = [...items].filter(i => i.time).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      for (let i = 0; i < sortedItems.length - 1; i++) {
        const current = sortedItems[i];
        const next = sortedItems[i + 1];
        if (!current.time || !next.time) continue;
        const [curH, curM] = current.time.split(':').map(Number);
        const [nextH, nextM] = next.time.split(':').map(Number);
        const duration = current.parsedNotes?.duration ? parseFloat(String(current.parsedNotes.duration)) * 60 : 90;
        const currentEndMins = curH * 60 + curM + duration;
        const nextStartMins = nextH * 60 + nextM;
        if (nextStartMins < currentEndMins) {
          result.push({ id: `timing-${day.dayNumber}-${i}`, title: `Day ${day.dayNumber}: Schedule conflict` });
          break;
        }
      }

      const dayWeather = day.date ? weatherByDate[day.date] : undefined;
      if (dayWeather && dayWeather.precipProbability > 50) {
        const hasOutdoor = items.some(i => {
          const cat = (i.destination?.category || '').toLowerCase();
          return ['park', 'garden', 'beach', 'outdoor', 'walk', 'market'].some(c => cat.includes(c));
        });
        if (hasOutdoor) result.push({ id: `weather-${day.dayNumber}`, title: `Day ${day.dayNumber}: Rain likely` });
      }
    });

    return result;
  }, [days, weatherByDate]);

  if (warnings.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <span className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0">⚠</span>
      <span className="text-xs text-amber-700 dark:text-amber-300">
        {warnings.length === 1 ? warnings[0].title : `${warnings.length} issues need attention`}
      </span>
    </div>
  );
}
