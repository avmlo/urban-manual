'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { TripPlanner } from '@/components/TripPlanner';
import { TripViewDrawer } from '@/components/TripViewDrawer';
import type { Trip } from '@/types/trip';

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch first location image for each trip
      const tripsWithImages = await Promise.all(
        (data || []).map(async (trip) => {
          // If trip has cover_image, use it
          if (trip.cover_image) {
            return { ...trip, firstLocationImage: null };
          }

          // Otherwise, fetch first itinerary item's image
          const { data: items } = await supabaseClient
            .from('itinerary_items')
            .select('destination_slug, notes')
            .eq('trip_id', trip.id)
            .order('day', { ascending: true })
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle();

          let firstLocationImage: string | null = null;

          if (items?.destination_slug) {
            // Try to get image from destination
            const { data: dest } = await supabaseClient
              .from('destinations')
              .select('image')
              .eq('slug', items.destination_slug)
              .maybeSingle();
            
            if (dest?.image) {
              firstLocationImage = dest.image;
            }
          } else if (items?.notes) {
            // Try to parse image from notes JSON
            try {
              const notesData = JSON.parse(items.notes);
              if (notesData.image) {
                firstLocationImage = notesData.image;
              }
            } catch {
              // Ignore parse errors
            }
          }

          return { ...trip, firstLocationImage };
        })
      );

      setTrips(tripsWithImages);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };


  const deleteTrip = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrips(trips.filter((trip) => trip.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };


  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="w-full">
        {/* Header - Matches account page style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                ITINERARY STUDIO
              </div>
              <h1 className="text-2xl font-light text-black dark:text-white">My Trips</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {trips.length} planned trip{trips.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              <span>New Trip</span>
            </button>
          </div>
        </div>
        {trips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No trips yet. Create your first trip to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map(trip => (
              <div
                key={trip.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
              >
                {/* Header */}
                <div className="relative h-32 bg-gray-200 dark:bg-gray-800">
                  {(trip.cover_image || (trip as any).firstLocationImage) ? (
                    <img 
                      src={trip.cover_image || (trip as any).firstLocationImage} 
                      alt={trip.title} 
                      className="h-full w-full object-cover" 
                    />
                  ) : null}
                  <div className="absolute top-3 right-3">
                    <span className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-900 dark:text-white text-xs px-2.5 py-1 rounded-full font-medium capitalize">
                      {trip.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-medium text-black dark:text-white mb-4">{trip.title}</h3>
                  
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-auto">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setViewingTripId(trip.id);
                        }}
                        className="text-sm font-medium text-black dark:text-white hover:opacity-60 transition-opacity"
                      >
                        View details
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingTripId(trip.id);
                            setShowCreateDialog(true);
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                          aria-label={`Edit ${trip.title}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteTrip(trip.id, trip.title);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:opacity-80 transition-opacity"
                          aria-label={`Delete ${trip.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trip Planner Modal */}
      <TripPlanner
        isOpen={showCreateDialog}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingTripId(null);
          // Refresh trips list after closing
          if (user) {
            fetchTrips();
          }
        }}
      />

      {/* Trip View Drawer */}
      {viewingTripId && (
        <TripViewDrawer
          isOpen={!!viewingTripId}
          onClose={() => {
            setViewingTripId(null);
            fetchTrips();
          }}
          tripId={viewingTripId}
          onEdit={() => {
            setEditingTripId(viewingTripId);
            setViewingTripId(null);
            setShowCreateDialog(true);
          }}
          onDelete={() => {
            fetchTrips();
          }}
        />
      )}
    </main>
  );
}
