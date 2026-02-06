/**
 * Intelligence Itinerary
 * Day-by-day intelligence with architectural context
 */

'use client';

import { Calendar, Clock, MapPin } from 'lucide-react';
import type { ArchitectureDestination } from '@/types/architecture';

interface DayItinerary {
  date: string;
  destinations: ArchitectureDestination[];
  narrative: string;
  total_time_minutes: number;
  walking_distance_km: number;
}

interface IntelligenceItineraryProps {
  itinerary: DayItinerary[];
}

export function IntelligenceItinerary({ itinerary }: IntelligenceItineraryProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Optimized Itinerary</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Intelligently scheduled to maximize your architectural experience
        </p>
      </div>

      {itinerary.map((day, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Day Header */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-semibold">Day {index + 1}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{Math.round(day.total_time_minutes / 60)}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{day.walking_distance_km.toFixed(1)}km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Day Narrative */}
          <div className="px-6 py-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">{day.narrative}</p>
          </div>

          {/* Destinations */}
          <div className="px-6 py-4 space-y-4">
            {day.destinations.map((destination, destIndex) => (
              <div
                key={destination.id || destIndex}
                className="flex gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                {destination.image && (
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{destination.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {destination.category} • {destination.city}
                  </p>
                  {destination.design_firm && (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      by {typeof destination.design_firm === 'string' ? destination.design_firm : destination.design_firm.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

