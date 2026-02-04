'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Trip as TripSchema, ItineraryItem, TripLocation, ItineraryItemNotes } from '@/types/trip';

// Simplified Trip interface for context (UI-friendly)
interface Trip {
  id: string;
  name: string;
  destination: string;
  locations: TripLocation[];
}

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTrip: (tripId: string | null) => void;
  createTrip: (name: string, destination: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(null);

  const fetchTrips = async () => {
    if (!user) {
      setTrips([]);
      setActiveTripState(null);
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data: tripsData, error: tripsError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      // Fetch locations for each trip
      const tripsWithLocations = await Promise.all(
        (tripsData as TripSchema[] || []).map(async (trip) => {
          const { data: itemsData, error: itemsError } = await supabaseClient
            .from('itinerary_items')
            .select('*')
            .eq('trip_id', trip.id)
            .order('day', { ascending: true })
            .order('order_index', { ascending: true });

          if (itemsError) {
            console.error('Error fetching itinerary items:', itemsError);
            return {
              id: trip.id,
              name: trip.title,
              destination: trip.destination || '',
              locations: [],
            };
          }

          const locations: TripLocation[] = (itemsData as ItineraryItem[] || []).map((item, index) => {
            // Parse notes for additional data
            let notesData: ItineraryItemNotes = {};
            if (item.notes) {
              try {
                notesData = JSON.parse(item.notes) as ItineraryItemNotes;
              } catch {
                notesData = { raw: item.notes };
              }
            }

            return {
              id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now() + index,
              name: item.title,
              city: notesData.city || trip.destination || '',
              category: item.description || '',
              image: notesData.image || '/placeholder-image.jpg',
              time: item.time || undefined,
              notes: notesData.raw || undefined,
              cost: notesData.cost || undefined,
              duration: notesData.duration || undefined,
              mealType: notesData.mealType || undefined,
            };
          });

          return {
            id: trip.id,
            name: trip.title,
            destination: trip.destination || '',
            locations,
          };
        })
      );

      setTrips(tripsWithLocations);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrips();
    } else {
      setTrips([]);
      setActiveTripState(null);
    }
  }, [user]);

  const setActiveTrip = (tripId: string | null) => {
    if (!tripId) {
      setActiveTripState(null);
      return;
    }
    const trip = trips.find((t) => t.id === tripId);
    setActiveTripState(trip || null);
  };

  const createTrip = async (name: string, destination: string) => {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .insert({
          title: name,
          destination: destination || null,
          status: 'planning',
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh trips list
      await fetchTrips();

      // Set as active trip
      if (data) {
        setActiveTrip(data.id);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Delete itinerary items first
      await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', tripId);

      // Delete trip
      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh trips list
      await fetchTrips();

      // Clear active trip if it was deleted
      if (activeTrip?.id === tripId) {
        setActiveTripState(null);
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        setActiveTrip,
        createTrip,
        deleteTrip,
        refreshTrips: fetchTrips,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}



