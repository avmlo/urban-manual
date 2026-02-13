'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { formatDestinationsFromField } from '@/types/trip';
import {
  getTripState,
  getTotalItems,
  type TripStats as TripStatsType,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';
import { TripModal } from '@/components/TripModal';

export interface TripWithStats extends Trip {
  stats: TripStatsType;
  mapCenter?: { lat: number; lng: number } | null;
}

interface TripsPageClientProps {
  initialTrips: TripWithStats[];
  userId: string;
}

type FilterTab = 'all' | 'upcoming' | 'past';

/**
 * TripsPageClient - Trips list with filter tabs
 */
export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips] = useState<TripWithStats[]>(initialTrips);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showWizard, setShowWizard] = useState(false);

  // Categorize trips by state
  const categorizedTrips = useMemo(() => {
    const upcoming: TripWithStats[] = [];
    const past: TripWithStats[] = [];

    trips.forEach((trip) => {
      const state = getTripState(trip.end_date, trip.start_date, trip.stats);
      if (state === 'past') {
        past.push(trip);
      } else {
        upcoming.push(trip);
      }
    });

    // Sort upcoming by start date (soonest first)
    upcoming.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return dateA - dateB;
    });

    // Sort past by end date (most recent first)
    past.sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date).getTime() : 0;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : 0;
      return dateB - dateA;
    });

    return { upcoming, past };
  }, [trips]);

  // Filter trips based on active tab
  const filteredTrips = useMemo(() => {
    switch (activeFilter) {
      case 'upcoming':
        return categorizedTrips.upcoming;
      case 'past':
        return categorizedTrips.past;
      default:
        return [...categorizedTrips.upcoming, ...categorizedTrips.past];
    }
  }, [activeFilter, categorizedTrips]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: trips.length,
    upcoming: categorizedTrips.upcoming.length,
    past: categorizedTrips.past.length,
  }), [trips.length, categorizedTrips]);

  // Create trip with wizard data
  const handleCreateTrip = useCallback(async (data: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
  }) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: data.title,
          destination: data.destination || null,
          start_date: data.startDate || null,
          end_date: data.endDate || null,
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (trip) {
        setShowWizard(false);
        router.push(`/trips/${trip.id}`);
      }
    } catch (err) {
      console.error('Error creating trip:', err);
      throw err;
    }
  }, [userId, router]);

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-20 bg-[var(--editorial-bg)]">
        {/* Header - Editorial style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1
              className="text-3xl font-normal text-[var(--editorial-text-primary)]"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              Trips
            </h1>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--editorial-accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--editorial-accent-hover)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </button>
          </div>
          <p className="text-sm text-[var(--editorial-text-secondary)]">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>

        {/* Tab Navigation - Editorial style */}
        {categorizedTrips.upcoming.length > 0 && categorizedTrips.past.length > 0 && (
          <div className="mb-12">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {(['all', 'upcoming', 'past'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`transition-all duration-200 ${
                    activeFilter === tab
                      ? 'font-medium text-[var(--editorial-text-primary)]'
                      : 'font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State - No trips at all */
          <div className="text-center py-16 border border-dashed border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)]">
            <MapPin className="h-12 w-12 mx-auto text-[var(--editorial-text-tertiary)] mb-4" />
            <p className="text-sm text-[var(--editorial-text-secondary)] mb-6">No trips yet</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-5 py-2.5 bg-[var(--editorial-accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--editorial-accent-hover)] transition-colors"
            >
              Create your first trip
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* Empty State - Filter has no results */
          <div className="text-center py-12">
            <p className="text-sm text-[var(--editorial-text-tertiary)]">
              No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} trips
            </p>
          </div>
        ) : (
          /* Trip Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

      {/* Trip Modal */}
      <TripModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        mode="create"
        onCreate={handleCreateTrip}
      />
    </main>
  );
}

/**
 * Trip Card - Editorial design style
 */
function TripCard({ trip }: { trip: TripWithStats }) {
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const destinations = formatDestinationsFromField(trip.destination);
  const totalItems = getTotalItems(trip.stats);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex flex-col border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] rounded-lg overflow-hidden hover:bg-[var(--editorial-border-subtle)] transition-colors"
    >
      <div className="text-left p-5 flex-1">
        <h3 className="font-medium text-sm text-[var(--editorial-text-primary)] mb-2 line-clamp-2">{trip.title}</h3>
        {trip.description && (
          <p className="text-sm text-[var(--editorial-text-secondary)] line-clamp-2 mb-3">{trip.description}</p>
        )}
        <div className="space-y-1.5 text-xs text-[var(--editorial-text-tertiary)]">
          {destinations && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{destinations}</span>
            </div>
          )}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            </div>
          )}
          {totalItems > 0 && (
            <div className="text-xs text-[var(--editorial-text-tertiary)] pt-1">
              {totalItems} {totalItems === 1 ? 'place' : 'places'}
            </div>
          )}
          {state && (
            <div className="pt-2">
              <span className={`capitalize text-xs px-2.5 py-1 rounded-md font-medium ${
                state === 'upcoming'
                  ? 'bg-[var(--editorial-accent)]/10 text-[var(--editorial-accent)]'
                  : 'bg-[var(--editorial-border)] text-[var(--editorial-text-secondary)]'
              }`}>
                {state}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
