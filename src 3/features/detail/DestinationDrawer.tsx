'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, MapPin, Tag, Bookmark, Share2, Navigation, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check, List, Map, Heart, Edit } from 'lucide-react';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    // Remove protocol if present
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path and query params
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    // If parsing fails, return original or a cleaned version
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { AddToTripModal } from '@/components/AddToTripModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { RealtimeReportForm } from '@/components/RealtimeReportForm';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { createClient } from '@/lib/supabase/client';

// Dynamically import POIDrawer to avoid SSR issues
const POIDrawer = dynamic(() => import('@/components/POIDrawer').then(mod => ({ default: mod.POIDrawer })), {
  ssr: false,
});

// Dynamically import MapView to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
        <span className="text-xs text-gray-600">Loading map...</span>
      </div>
    </div>
  )
});

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image: string | null;
  michelin_stars: number | null;
  crown: boolean;
}

interface DestinationDrawerProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onVisitToggle?: (slug: string, visited: boolean) => void;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// City timezone mapping (fallback if timezone_id not available)
const CITY_TIMEZONES: Record<string, string> = {
  'tokyo': 'Asia/Tokyo',
  'new-york': 'America/New_York',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'bangkok': 'Asia/Bangkok',
  // Add more as needed
};

function getOpenStatus(openingHours: any, city: string, timezoneId?: string | null, utcOffset?: number | null): { isOpen: boolean; currentDay?: string; todayHours?: string } {
  if (!openingHours || !openingHours.weekday_text) {
    return { isOpen: false };
  }

  try {
    // Use timezone_id from Google Places API if available (handles DST automatically)
    // Otherwise fallback to city mapping, then UTC offset calculation, then UTC
    let now: Date;
    
    if (timezoneId) {
      // Best: Use timezone_id - automatically handles DST
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      // Good: Use city timezone mapping
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      // Okay: Use UTC offset (static, doesn't handle DST)
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
    } else {
      // Fallback: UTC
      now = new Date();
    }
    
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Google Places API weekday_text starts with Monday (index 0)
    // We need to convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) {
      return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    }

    // Check if closed
    if (hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    // Check if 24 hours
    if (hoursText.toLowerCase().includes('24 hours') || hoursText.toLowerCase().includes('open 24 hours')) {
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    }

    // Parse time ranges (e.g., "10:00 AM – 9:00 PM" or "10:00 AM – 2:00 PM, 5:00 PM – 9:00 PM")
    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, currentDay: dayName, todayHours: hoursText };
        }
      }
    }

    return { isOpen: false, currentDay: dayName, todayHours: hoursText };
  } catch (error) {
    console.error('Error parsing opening hours:', error);
    return { isOpen: false };
  }
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function DestinationDrawer({ destination, isOpen, onClose, onSaveToggle, onVisitToggle }: DestinationDrawerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Generate AI summary of reviews
  const generateReviewSummary = async (reviews: any[], destinationName: string) => {
    if (!reviews || reviews.length === 0) return;
    
    setLoadingReviewSummary(true);
    try {
      const response = await fetch('/api/reviews/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviews,
          destinationName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate review summary');
      }

      const data = await response.json();
      if (data.summary) {
        setReviewSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating review summary:', error);
    } finally {
      setLoadingReviewSummary(false);
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination) {
        setEnrichedData(null);
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false); // Reset immediately
        setReviewSummary(null);
        return;
      }

      // Reset isAddedToTrip immediately when destination changes to prevent showing "Added" for all places
      setIsAddedToTrip(false);

      // Fetch enriched data from database
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('Supabase client not available');
          return;
        }

        const { data, error } = await supabaseClient
          .from('destinations')
          .select(`
            formatted_address,
            international_phone_number,
            website,
            rating,
            user_ratings_total,
            price_level,
            opening_hours_json,
            editorial_summary,
            google_name,
            place_types_json,
            utc_offset,
            vicinity,
            reviews_json,
            timezone_id,
            latitude,
            longitude,
            plus_code,
            adr_address,
            address_components_json,
            icon_url,
            icon_background_color,
            icon_mask_base_uri,
            google_place_id
          `)
          .eq('slug', destination.slug)
          .single();
        
        if (!error && data) {
          // Parse JSON fields
          const dataObj = data as any;
          const enriched: any = { ...(dataObj as Record<string, any>) };
          if (dataObj.opening_hours_json) {
            try {
              enriched.opening_hours = typeof dataObj.opening_hours_json === 'string' 
                ? JSON.parse(dataObj.opening_hours_json) 
                : dataObj.opening_hours_json;
            } catch (e) {
              console.error('Error parsing opening_hours_json:', e);
            }
          }
          // current/secondary opening hours fields removed; rely on opening_hours_json only
          if (dataObj.place_types_json) {
            try {
              enriched.place_types = typeof dataObj.place_types_json === 'string'
                ? JSON.parse(dataObj.place_types_json)
                : dataObj.place_types_json;
            } catch (e) {
              console.error('Error parsing place_types_json:', e);
            }
          }
          if (dataObj.reviews_json) {
            try {
              enriched.reviews = typeof dataObj.reviews_json === 'string'
                ? JSON.parse(dataObj.reviews_json)
                : dataObj.reviews_json;
              
              // Generate AI summary of reviews
              if (Array.isArray(enriched.reviews) && enriched.reviews.length > 0) {
                generateReviewSummary(enriched.reviews, destination.name);
              }
            } catch (e) {
              console.error('Error parsing reviews_json:', e);
            }
          }
          if (dataObj.address_components_json) {
            try {
              enriched.address_components = typeof dataObj.address_components_json === 'string'
                ? JSON.parse(dataObj.address_components_json)
                : dataObj.address_components_json;
            } catch (e) {
              console.error('Error parsing address_components_json:', e);
            }
          }
          setEnrichedData(enriched);
          console.log('Enriched data loaded:', enriched);
        } else if (error) {
          console.error('Error fetching enriched data:', error);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
      }

      // Load saved and visited status
      if (!user) {
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
        return;
      }

      const supabaseClient = createClient();
      if (supabaseClient) {
        if (destination.slug) {
          const { data: savedData } = await supabaseClient
        .from('saved_places')
            .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
            .maybeSingle();

      setIsSaved(!!savedData);
        }

        const { data: visitedData, error: visitedError } = await supabaseClient
        .from('visited_places')
          .select('id, visited_at')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
          .maybeSingle();

      if (visitedError && visitedError.code !== 'PGRST116') {
        console.error('Error loading visited status:', visitedError);
      }

      setIsVisited(!!visitedData);
      if (visitedData) {
        console.log('Visited status loaded:', visitedData);
      }

      // Check if destination is in any of user's trips
      if (destination.slug) {
        // First get all user's trips
        const { data: userTrips } = await supabaseClient
          .from('trips')
          .select('id')
          .eq('user_id', user.id);

        if (userTrips && userTrips.length > 0) {
          const tripIds = userTrips.map(t => t.id);
          // Check if destination is in any of these trips
          const { data: tripItems } = await supabaseClient
            .from('itinerary_items')
            .select('id')
            .eq('destination_slug', destination.slug)
            .in('trip_id', tripIds)
            .limit(1);

          setIsAddedToTrip(!!tripItems && tripItems.length > 0);
        } else {
          setIsAddedToTrip(false);
        }
      } else {
        setIsAddedToTrip(false);
      }
      } else {
        setIsSaved(false);
        setIsVisited(false);
        setIsAddedToTrip(false);
      }

      // Check if user is admin - fetch fresh session to get latest metadata
      if (user) {
        try {
          const supabaseClient = createClient();
          const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
          
          if (!sessionError && session) {
            const role = (session.user.app_metadata as Record<string, any> | null)?.role;
            const isUserAdmin = role === 'admin';
            setIsAdmin(isUserAdmin);
            // Debug log (remove in production)
            if (process.env.NODE_ENV === 'development') {
              console.log('[DestinationDrawer] Admin check:', { 
                role, 
                isUserAdmin, 
                userId: session.user.id,
                hasDestination: !!destination,
                hasSession: !!session
              });
            }
          } else {
            // Fallback to user from context if session fetch fails
            const role = (user.app_metadata as Record<string, any> | null)?.role;
            const isUserAdmin = role === 'admin';
            setIsAdmin(isUserAdmin);
            if (process.env.NODE_ENV === 'development') {
              console.log('[DestinationDrawer] Admin check (fallback):', { 
                role, 
                isUserAdmin, 
                userId: user.id,
                sessionError: sessionError?.message
              });
            }
          }
        } catch (error) {
          console.error('[DestinationDrawer] Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    }

    loadDestinationData();
  }, [user, destination]);

  // Load parent and nested destinations
  useEffect(() => {
    async function loadNestedData() {
      if (!destination || !isOpen) {
        setParentDestination(null);
        setNestedDestinations([]);
        return;
      }

      setLoadingNested(true);
      const supabaseClient = createClient();
      if (!supabaseClient) {
        setLoadingNested(false);
        return;
      }

      try {
        // Load parent if this is a nested destination
        if (destination.parent_destination_id) {
          const parent = await getParentDestination(supabaseClient, destination.id!);
          setParentDestination(parent);
      } else {
          setParentDestination(null);
        }

        // Load nested destinations if this is a parent
        if (destination.id) {
          const nested = await getNestedDestinations(supabaseClient, destination.id, false);
          setNestedDestinations(nested);
      } else {
          setNestedDestinations([]);
      }
    } catch (error) {
        console.warn('[DestinationDrawer] Error loading nested data:', error);
    } finally {
        setLoadingNested(false);
    }
    }

    loadNestedData();
  }, [destination, isOpen]);


  const handleShare = async () => {
    if (!destination) return;

    const url = `${window.location.origin}/destination/${destination.slug}`;
    const title = destination.name || 'Check out this place';
    const text = `Visit ${destination.name} in ${capitalizeCity(destination.city)}`;

    // Use native Web Share API if available (iOS Safari, Android Chrome, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err: any) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else {
      // Fallback to clipboard for browsers without native share
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const handleVisitToggle = async () => {
    if (!user || !destination) {
      if (!user) {
        router.push('/auth/login');
      }
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      if (isVisited) {
        // Remove visit
        const { error } = await supabaseClient
          .from('visited_places')
        .delete()
          .eq('user_id', user.id)
        .eq('destination_slug', destination.slug);

      if (error) {
          console.error('Error removing visit:', error);
          throw error;
      }

        setIsVisited(false);
        if (onVisitToggle) onVisitToggle(destination.slug, false);
    } else {
        // Add visit with current date (no modal needed - just mark as visited)
        if (!destination.slug) {
          alert('Invalid destination. Please try again.');
          return;
        }

        const visitedAt = new Date().toISOString();
        let saved = false;
        let savedData = null;

        // Try upsert first
        const { data: upsertData, error: upsertError } = await supabaseClient
          .from('visited_places')
          .upsert({
            user_id: user.id,
          destination_slug: destination.slug,
            visited_at: visitedAt,
          }, {
            onConflict: 'user_id,destination_slug',
          })
          .select()
          .single();

        if (!upsertError && upsertData) {
          console.log('Visit saved via upsert:', upsertData);
          saved = true;
          savedData = upsertData;
        } else if (upsertError) {
          // Check if error is related to activity_feed RLS policy (from trigger)
          if (upsertError.message && upsertError.message.includes('activity_feed') && upsertError.message.includes('row-level security')) {
            // Visit was saved but activity_feed insert failed - verify the visit exists
            console.warn('Visit saved via upsert but activity_feed insert failed due to RLS policy. Verifying visit...');
            const { data: verifyData } = await supabaseClient
              .from('visited_places')
              .select('*')
              .eq('user_id', user.id)
              .eq('destination_slug', destination.slug)
              .maybeSingle();
            
            if (verifyData) {
              console.log('Visit verified after RLS error:', verifyData);
              saved = true;
              savedData = verifyData;
            } else {
              // If verification fails, continue to fallback logic
              console.error('Upsert error (RLS) but visit not found, trying fallback:', upsertError);
            }
          } else {
            console.error('Upsert error:', upsertError);
          }
        }
        
        // If upsert failed (and not handled by RLS check above), try insert as fallback
        if (!saved) {
          // If upsert fails, try insert
          const { data: insertData, error: insertError } = await supabaseClient
            .from('visited_places')
            .insert({
              user_id: user.id,
              destination_slug: destination.slug,
              visited_at: visitedAt,
            })
            .select()
            .single();

          if (!insertError && insertData) {
            console.log('Visit saved via insert:', insertData);
            saved = true;
            savedData = insertData;
          } else if (insertError) {
            // If insert fails due to conflict, try update
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log('Visit already exists, updating instead...');
              const { data: updateData, error: updateError } = await supabaseClient
                .from('visited_places')
                .update({
                  visited_at: visitedAt,
                })
                .eq('user_id', user.id)
                .eq('destination_slug', destination.slug)
                .select()
                .single();

              if (!updateError && updateData) {
                console.log('Visit saved via update:', updateData);
                saved = true;
                savedData = updateData;
              } else if (updateError) {
                console.error('Error updating visit:', updateError);
                // Check if error is related to activity_feed RLS policy
                if (updateError.message && updateError.message.includes('activity_feed') && updateError.message.includes('row-level security')) {
                  // Visit was updated but activity_feed insert failed - verify the visit exists
                  console.warn('Visit updated but activity_feed insert failed due to RLS policy. Verifying visit...');
                  // Verify the visit was actually saved
                  const { data: verifyData } = await supabaseClient
                    .from('visited_places')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug)
                    .maybeSingle();
                  
                  if (verifyData) {
                    console.log('Visit verified after RLS error:', verifyData);
                    saved = true;
                    savedData = verifyData;
                  } else {
                    throw updateError;
                  }
                } else {
                  throw updateError;
                }
              }
            } else {
              console.error('Error adding visit:', insertError);
              // Check if error is related to activity_feed RLS policy
              if (insertError.message && insertError.message.includes('activity_feed') && insertError.message.includes('row-level security')) {
                // Visit was created but activity_feed insert failed - verify the visit exists
                console.warn('Visit created but activity_feed insert failed due to RLS policy. Verifying visit...');
                // Verify the visit was actually saved
                const { data: verifyData } = await supabaseClient
                  .from('visited_places')
                  .select('*')
                  .eq('user_id', user.id)
                  .eq('destination_slug', destination.slug)
                  .maybeSingle();
                
                if (verifyData) {
                  console.log('Visit verified after RLS error:', verifyData);
                  saved = true;
                  savedData = verifyData;
                } else {
                  throw insertError;
                }
              } else {
                throw insertError;
              }
            }
          }
        }

        // Verify the data was actually saved before updating UI
        if (saved && savedData) {
          // Double-check by querying the database
          const { data: verifyData, error: verifyError } = await supabaseClient
            .from('visited_places')
            .select('*')
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug)
            .maybeSingle();

          if (verifyError && verifyError.code !== 'PGRST116') {
            console.error('Verification error:', verifyError);
            throw new Error('Failed to verify visit was saved');
          }

          if (verifyData) {
            console.log('Visit verified in database:', verifyData);
            setIsVisited(true);
            if (onVisitToggle) onVisitToggle(destination.slug, true);
          } else {
            throw new Error('Visit was not found in database after save');
          }
        } else {
          throw new Error('Failed to save visit');
        }
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      const errorMessage = error?.message || 'Failed to update visit status. Please try again.';
      alert(errorMessage);
    }
  };

  const handleVisitedModalUpdate = async () => {
    // Reload visited status after modal updates
    if (!user || !destination) return;

      const supabaseClient = createClient();
      if (!supabaseClient) {
        setIsVisited(false);
        return;
      }

      const { data: visitedData } = await supabaseClient
        .from('visited_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .single();

    setIsVisited(!!visitedData);
    if (onVisitToggle && visitedData) onVisitToggle(destination.slug, true);
  };


  // Load AI recommendations
  useEffect(() => {
    async function loadRecommendations() {
      if (!destination || !isOpen) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);

      try {
        const response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
        
        // If unauthorized, skip recommendations (user not signed in)
        if (response.status === 401 || response.status === 403) {
          setRecommendations([]);
          setLoadingRecommendations(false);
          return;
        }
        
        if (!response.ok) {
          // Try fallback to related destinations
          try {
            const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
            if (relatedResponse.ok) {
              const relatedData = await relatedResponse.json();
              if (relatedData.related) {
                setRecommendations(
                  relatedData.related.map((dest: any) => ({
                    slug: dest.slug,
                    name: dest.name,
                    city: dest.city,
                    category: dest.category,
                    image: dest.image,
                    michelin_stars: dest.michelin_stars,
                    crown: dest.crown,
                    rating: dest.rating,
                  }))
                );
              }
            }
          } catch {
            // Silently fail - recommendations are optional
          }
          setLoadingRecommendations(false);
          return;
        }
        
        const data = await response.json();

        const dataObj2 = data as any;
        if (dataObj2.recommendations && Array.isArray(dataObj2.recommendations)) {
          setRecommendations(
            dataObj2.recommendations
              .map((rec: any) => rec.destination || rec)
              .filter(Boolean)
          );
        } else {
          setRecommendations([]);
        }
      } catch (error) {
        // Silently fail - recommendations are optional
        setRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    loadRecommendations();
  }, [destination, isOpen]);

  if (!destination) return null;

  // Get rating for display
  const rating = enrichedData?.rating || destination.rating;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile Drawer (mimics desktop design) */}
      <div
        className={`md:hidden fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-950 z-50 shadow-2xl ring-1 ring-black/5 rounded-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } overflow-hidden flex flex-col`}
      >
        {/* Header with Close Button */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between relative">
          <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Details</h2>
          <div className="flex items-center gap-2">
            {destination?.slug && destination.slug.trim() && (
              <Link
                href={`/destination/${destination.slug}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="Open destination page"
                aria-label="Open destination page"
              >
                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Link>
            )}
          </div>
          {/* Close Button - Top Right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Image */}
          {destination.image && (
            <div className="mt-[18px] rounded-[8px] overflow-hidden aspect-[4/3]">
              <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 420px"
                  priority={false}
                  quality={85}
                />
              </div>
            </div>
          )}

          {/* Hotel Summary Section */}
          <div className="mt-6 space-y-3">
            {/* Name */}
            <h1 className="text-2xl font-semibold text-black dark:text-white leading-tight">
              {destination.name}
            </h1>

            {/* Location & Rating Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {destination.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {capitalizeCity(destination.city)}
                  </span>
                </div>
              )}
              {rating && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
              {destination.category && (
                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                  {destination.category}
                </span>
              )}
            </div>

            {/* Description */}
            {destination.micro_description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {destination.micro_description}
              </p>
            )}
          </div>

          {/* Details Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              {destination.category && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="text-gray-900 dark:text-white">{destination.category}</span>
                </div>
              )}
              {destination.city && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Location:</span>
                  <span className="text-gray-900 dark:text-white">{capitalizeCity(destination.city)}</span>
                </div>
              )}
              {destination.category && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Category:</span>
                  <span className="text-gray-900 dark:text-white">{destination.category}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {/* Favorite and Share Buttons */}
          <div className="flex items-center justify-end gap-3 mb-4">
            {/* Favorite Button */}
            <button
              onClick={async () => {
                if (!user) {
                  router.push('/auth/login');
                  return;
                }
                if (!isSaved) {
                  setShowSaveModal(true);
                } else {
                  // Quick unsave
                  try {
                    const supabaseClient = createClient();
                    if (!supabaseClient) {
                      alert('Failed to connect to database. Please try again.');
                      return;
                    }
                    const { error } = await supabaseClient
                      .from('saved_places')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('destination_slug', destination.slug);
                    if (!error) {
                      setIsSaved(false);
                      if (onSaveToggle) onSaveToggle(destination.slug, false);
                    }
                  } catch (error) {
                    console.error('Error unsaving:', error);
                  }
                }
              }}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSaved
                  ? 'bg-black dark:bg-white border-black dark:border-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700'
              }`}
              aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-5 w-5 ${
                isSaved
                  ? 'fill-white dark:fill-black text-white dark:text-black'
                  : 'text-gray-900 dark:text-gray-100'
              }`} />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            </button>

            {/* Edit Button (Admin Only) */}
            {isAdmin && destination && (
              <button
                onClick={() => setIsEditDrawerOpen(true)}
                className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Edit destination"
                aria-label="Edit destination"
              >
                <Edit className="h-5 w-5 text-gray-900 dark:text-gray-100" />
              </button>
            )}
          </div>

          {/* Action Buttons - Side by Side */}
          <div className="flex gap-3">
            {/* View More Details Button */}
            {destination.slug && (
              <Link
                href={`/destination/${destination.slug}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black text-center py-3.5 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
              >
                View More Details
              </Link>
            )}
            
            {/* Add to Trip Button */}
            <button
              onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                  return;
                }
                if (isAddedToTrip) return;
                setShowAddToTripModal(true);
                }}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isAddedToTrip
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              disabled={isAddedToTrip}
            >
              {isAddedToTrip ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add to Trip</span>
                </>
              )}
              </button>
          </div>
        </div>
      </div>

      {/* Desktop Slideover Card (existing design) */}
      <div
        className={`hidden md:flex fixed right-4 top-4 bottom-4 w-[440px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-950 z-50 shadow-2xl ring-1 ring-black/5 rounded-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
        } overflow-hidden flex-col`}
      >
        {/* Header with Close Button */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between relative">
          <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Details</h2>
          <div className="flex items-center gap-2">
            {destination?.slug && destination.slug.trim() && (
              <Link
                href={`/destination/${destination.slug}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
                title="Open destination page"
                aria-label="Open destination page"
              >
                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Link>
            )}
          </div>
          {/* Close Button - Top Right */}
            <button
              onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
            >
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Image */}
          {destination.image && (
            <div className="mt-[18px] rounded-[8px] overflow-hidden aspect-[4/3]">
              <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800">
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
                priority={false}
                quality={85}
              />
              </div>
            </div>
          )}

          {/* Identity Block */}
          <div className="space-y-4 mt-6">
            {/* Location Badge */}
            <div>
              <a
                href={`/city/${destination.city}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/city/${destination.city}`);
                }}
              >
                <MapPin className="h-3 w-3" />
                {destination.country ? `${capitalizeCity(destination.city)}, ${destination.country}` : capitalizeCity(destination.city)}
              </a>
            </div>

          {/* Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-medium leading-tight text-black dark:text-white">
                {destination.name}
              </h1>

              {/* Pills: Category, Crown, Michelin, Google Rating */}
              <div className="flex flex-wrap gap-2">
              {destination.category && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {destination.category}
                    </span>
                )}

                {destination.crown && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400">
                    Crown
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to local file if external URL fails
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
                  />
                  {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
                  </span>
            )}

                {(enrichedData?.rating || destination.rating) && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                    </span>
              )}
                  </div>

              {destination.micro_description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {destination.micro_description}
                </p>
                )}
              </div>

            {/* Action Row - Pill Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Save Button with Dropdown */}
              <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved) {
                        // Quick save without opening dropdown
                        e.preventDefault();
                        setShowSaveModal(true);
                        setShowSaveDropdown(false);
                      }
                    }}
                  >
                    <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                    {isSaved && <ChevronDown className="h-3 w-3 ml-0.5" />}
                  </button>
                </DropdownMenuTrigger>
                {isSaved && (
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => {
                      setShowSaveModal(true);
                      setShowSaveDropdown(false);
                    }}>
                      <List className="h-3 w-3 mr-2" />
                      Save to List
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      router.push('/trips');
                      setShowSaveDropdown(false);
                    }}>
                      <Map className="h-3 w-3 mr-2" />
                      Save to Trip
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      router.push('/account?tab=collections');
                      setShowSaveDropdown(false);
                    }}>
                      <Plus className="h-3 w-3 mr-2" />
                      Create a List
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      // Unsave from saved_places
                      if (destination?.slug && user) {
                        try {
                          const supabaseClient = createClient();
                          if (supabaseClient) {
                            const { error } = await supabaseClient
                              .from('saved_places')
                              .delete()
                              .eq('user_id', user.id)
                              .eq('destination_slug', destination.slug);
                            if (!error) {
                              setIsSaved(false);
                              if (onSaveToggle) onSaveToggle(destination.slug, false);
                            }
                          }
                        } catch (error) {
                          console.error('Error unsaving:', error);
                          alert('Failed to unsave. Please try again.');
                        }
                      }
                      setShowSaveDropdown(false);
                    }}>
                      <X className="h-3 w-3 mr-2" />
                      Remove from Saved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>

              {/* Visited Button with Dropdown */}
              {user && (
                <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs transition-colors flex items-center gap-1.5 ${
                        isVisited
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={(e) => {
                        if (!isVisited) {
                          e.preventDefault();
                          handleVisitToggle();
                        }
                        // If already visited, let the dropdown handle the click
                      }}
                    >
                      <Check className={`h-3 w-3 ${isVisited ? 'stroke-[3]' : ''}`} />
                      {isVisited ? 'Visited' : 'Mark Visited'}
                      {isVisited && <ChevronDown className="h-3 w-3 ml-0.5" />}
                    </button>
                  </DropdownMenuTrigger>
                  {isVisited && (
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        setShowVisitedModal(true);
                        setShowVisitedDropdown(false);
                      }}>
                        <Plus className="h-3 w-3 mr-2" />
                        Add Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        handleVisitToggle();
                        setShowVisitedDropdown(false);
                      }}>
                        <X className="h-3 w-3 mr-2" />
                        Remove Visit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              )}

              {destination.slug && destination.slug.trim() ? (
                <button
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      router.push(`/destination/${destination.slug}`);
                    }, 100);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Page
                </button>
              ) : null}
                  </div>
                </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* Meta & Info Section */}
          <div className="space-y-6">
            {/* Parent destination context */}
            {parentDestination && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <LocatedInBadge
                    parent={parentDestination}
                    onClick={() => {
                      if (parentDestination.slug && parentDestination.slug.trim()) {
                        router.push(`/destination/${parentDestination.slug}`);
                        onClose();
                      }
                    }}
                  />
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/80 dark:bg-dark-blue-900/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Located inside</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{parentDestination.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {parentDestination.category && parentDestination.city
                        ? `${parentDestination.category} · ${capitalizeCity(parentDestination.city)}`
                        : parentDestination.category || capitalizeCity(parentDestination.city || '')}
                    </p>
                  </div>

                  <button
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => {
                      if (parentDestination.slug && parentDestination.slug.trim()) {
                        router.push(`/destination/${parentDestination.slug}`);
                        onClose();
                      }
                    }}
                  >
                    View {parentDestination.name}
                  </button>
                </div>
              </div>
            )}

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                {destination.tags.map((tag, index) => (
                    <span
                    key={index}
                    className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400"
                    >
                    {tag}
                    </span>
                  ))}
                </div>
            )}

            {/* Real-Time Status */}
            {destination.id && (
              <div className="space-y-4">
                <RealtimeStatusBadge
                  destinationId={destination.id}
                  compact={false}
                  showWaitTime={true}
                  showAvailability={true}
                />
                <RealtimeReportForm
                  destinationId={destination.id}
                  destinationName={destination.name}
                />
              </div>
            )}

            {/* Opening Hours */}
            {(() => {
              const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours || destination.opening_hours;
              if (!hours || !hours.weekday_text || !Array.isArray(hours.weekday_text) || hours.weekday_text.length === 0) {
                return null;
              }
              
              const openStatus = getOpenStatus(
                hours, 
                destination.city, 
                enrichedData?.timezone_id, 
                enrichedData?.utc_offset
              );
              
              let now: Date;
              if (enrichedData?.timezone_id) {
                now = new Date(new Date().toLocaleString('en-US', { timeZone: enrichedData.timezone_id }));
              } else if (CITY_TIMEZONES[destination.city]) {
                now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[destination.city] }));
              } else if (enrichedData?.utc_offset !== null && enrichedData?.utc_offset !== undefined) {
                const utcNow = new Date();
                now = new Date(utcNow.getTime() + (enrichedData.utc_offset * 60 * 1000));
              } else {
                now = new Date();
              }
              
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {openStatus.todayHours && (
                      <>
                        <span className="text-sm font-medium text-black dark:text-white">
                        {openStatus.isOpen ? 'Open now' : 'Closed'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        · {openStatus.todayHours}
                      </span>
                      </>
                    )}
                  </div>
                  {hours.weekday_text && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        View all hours
                      </summary>
                      <div className="mt-2 space-y-1 pl-6">
                        {hours.weekday_text.map((day: string, index: number) => {
                          const [dayName, hoursText] = day.split(': ');
                          const dayOfWeek = now.getDay();
                          const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const isToday = index === googleDayIndex;

                          return (
                            <div key={index} className={`flex justify-between ${isToday ? 'font-medium text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              <span>{dayName}</span>
                              <span>{hoursText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

            {/* Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity) && (
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black dark:text-white mb-1">Address</div>
                    {enrichedData?.formatted_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{enrichedData.formatted_address}</div>
                    )}
                    {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{enrichedData.vicinity}</div>
                    )}
              </div>
              </div>
            </div>
          )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + destination.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="h-3 w-3" />
                Directions
              </a>
              <button
                onClick={handleShare}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>
            </div>

            {/* Nested Destinations */}
            {(loadingNested || (nestedDestinations && nestedDestinations.length > 0)) && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                {loadingNested ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading venues located here…
                  </div>
                ) : (
                  nestedDestinations && nestedDestinations.length > 0 && (
                    <NestedDestinations
                      destinations={nestedDestinations}
                      parentName={destination.name}
                      onDestinationClick={(nested) => {
                        if (nested.slug) {
                          onClose();
                          setTimeout(() => router.push(`/destination/${nested.slug}`), 100);
                        }
                      }}
                    />
                  )
                )}
              </div>
            )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />


          {/* Description */}
          {destination.description && (
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {stripHtmlTags(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Contact & Links */}
          {(enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Contact</h3>
              <div className="flex flex-wrap gap-2">
                {(enrichedData?.website || destination.website) && (() => {
                  const websiteUrl = (enrichedData?.website || destination.website) || '';
                  const fullUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                  const domain = extractDomain(websiteUrl);
                  return (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span>{domain}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    </a>
                  );
                })()}
                {(enrichedData?.international_phone_number || destination.phone_number) && (
                  <a
                    href={`tel:${enrichedData?.international_phone_number || destination.phone_number}`}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {enrichedData?.international_phone_number || destination.phone_number}
                  </a>
                )}
                {destination.instagram_url && (
                  <a
                    href={destination.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI Review Summary */}
          {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">What Reviewers Say</h3>
              {loadingReviewSummary ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                  <span>Summarizing reviews...</span>
                        </div>
              ) : reviewSummary ? (
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
                      </div>
              ) : null}
            </div>
          )}

          {/* Map Section */}
          {(destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <MapView
                  destinations={[{
                    ...destination,
                    latitude: destination.latitude || enrichedData?.latitude,
                    longitude: destination.longitude || enrichedData?.longitude,
                  }].filter(d => d.latitude && d.longitude) as Destination[]}
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  isDark={false}
              />
            </div>
          </div>
          )}

          {/* AI Recommendations */}
          {(loadingRecommendations || recommendations.length > 0) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  You might also like
                </h3>
              </div>

              {loadingRecommendations ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-shrink-0 w-32">
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl mb-2 animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-start">
                  {recommendations.map(rec => (
                    <button
                      key={rec.slug}
                      onClick={() => {
                        if (rec.slug && rec.slug.trim()) {
                        router.push(`/destination/${rec.slug}`);
                        }
                      }}
                      className="group text-left w-full flex flex-col"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-800">
                        {rec.image ? (
                          <img
                            src={rec.image}
                            alt={rec.name}
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.fallback-placeholder')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-placeholder w-full h-full flex items-center justify-center';
                                fallback.innerHTML = '<svg class="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-8 w-8 opacity-20" />
                          </div>
                        )}
                        {rec.michelin_stars && rec.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1">
                            <img
                              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                              alt="Michelin star"
                              className="h-3 w-3"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback to local file if external URL fails
                                const target = e.currentTarget;
                                if (target.src !== '/michelin-star.svg') {
                                  target.src = '/michelin-star.svg';
                                }
                              }}
                            />
                            <span>{rec.michelin_stars}</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-xs leading-tight line-clamp-2 mb-1 text-black dark:text-white">
                        {rec.name}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {capitalizeCity(rec.city)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

      </div>

        {/* Desktop Action Buttons - Bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex gap-3">
            {/* View More Details Button */}
            {destination.slug && (
              <Link
                href={`/destination/${destination.slug}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  }}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black text-center py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
                    >
                View More Details
              </Link>
                      )}
            
            {/* Add to Trip Button */}
                <button
                  onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                  return;
                }
                if (isAddedToTrip) return;
                setShowAddToTripModal(true);
                  }}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                isAddedToTrip
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              disabled={isAddedToTrip}
            >
              {isAddedToTrip ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add to Trip</span>
                </>
              )}
                </button>
          </div>
        </div>
            </div>

      {/* Save Destination Modal */}
      {destination?.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={async () => {
            setShowSaveModal(false);
            // Reload saved status after modal closes
            if (user && destination?.slug) {
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { data } = await supabaseClient
                    .from('saved_places')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug)
                    .single();
                  setIsSaved(!!data);
                } else {
                  setIsSaved(false);
                }
              } catch {
                setIsSaved(false);
              }
            }
          }}
          onSave={async (collectionId) => {
            // If collectionId is null, user unsaved - remove from saved_places
            if (collectionId === null && destination.slug && user) {
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { error } = await supabaseClient
                    .from('saved_places')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug);
                  if (!error) {
                    setIsSaved(false);
                    if (onSaveToggle) onSaveToggle(destination.slug, false);
                  }
                }
              } catch (error) {
                console.error('Error removing from saved_places:', error);
              }
            } else if (collectionId !== null && destination.slug && user) {
              // Also save to saved_places for simple save functionality
              try {
                const supabaseClient = createClient();
                if (supabaseClient) {
                  const { error } = await supabaseClient
                    .from('saved_places')
                    .upsert({
                      user_id: user.id,
                      destination_slug: destination.slug,
                    });
                  if (!error) {
                    setIsSaved(true);
                    if (onSaveToggle) onSaveToggle(destination.slug, true);
                  }
                }
              } catch (error) {
                console.error('Error saving to saved_places:', error);
              }
            }
          }}
        />
      )}

      {/* Visited Modal */}
      {destination && (
        <VisitedModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showVisitedModal}
          onClose={() => setShowVisitedModal(false)}
          onUpdate={handleVisitedModalUpdate}
        />
      )}

      {/* Add to Trip Modal */}
      {destination && (
        <AddToTripModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showAddToTripModal}
          onClose={() => setShowAddToTripModal(false)}
          onAdd={(tripId) => {
            setIsAddedToTrip(true);
            setShowAddToTripModal(false);
            console.log(`Added ${destination.name} to trip ${tripId}`);
          }}
        />
      )}
      <POIDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        destination={destination}
        onSave={() => {
          setIsEditDrawerOpen(false);
          // Optionally refresh destination data here if needed
        }}
      />
    </>
  );
}
