'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, X, MapPin, Tag, Bookmark, Share2, Navigation, ChevronDown, Plus, Loader2, Clock, ExternalLink, Check, List, Map, Heart, Edit, Crown, Star, Instagram, Phone, Globe, Building2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import GooglePlacesAutocompleteNative from '@/components/GooglePlacesAutocompleteNative';
import { CityAutocompleteInput } from '@/components/CityAutocompleteInput';
import { CategoryAutocompleteInput } from '@/components/CategoryAutocompleteInput';
import { ParentDestinationAutocompleteInput } from '@/components/ParentDestinationAutocompleteInput';
import { ArchitectTagInput } from '@/components/ArchitectTagInput';

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
} from '@/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group';
import { Destination } from '@/types/destination';
import type { ItineraryItemNotes } from '@/types/trip';
import { useAuth } from '@/contexts/AuthContext';
import { htmlToPlainText } from '@/lib/sanitize';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { trackEvent } from '@/lib/analytics/track';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';
import { NestedDestinations } from '@/components/NestedDestinations';
import { getParentDestination, getNestedDestinations } from '@/lib/supabase/nested-destinations';
import { createClient } from '@/lib/supabase/client';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { Drawer } from '@/ui/Drawer';
import { architectNameToSlug, parseDesignFirms } from '@/lib/architect-utils';
import { DestinationCard } from '@/components/DestinationCard';
import { InlineAddToTrip } from './InlineAddToTrip';
import { SimilarPlacesGrid } from './SimilarPlacesGrid';


// Dynamically import GoogleStaticMap for small map in drawer
const GoogleStaticMap = dynamic(() => import('@/features/maps/components/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
        <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
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
  onDestinationClick?: (slug: string) => void;
  onEdit?: (destination: Destination) => void; // Callback for editing destination
  onDestinationUpdate?: () => void; // Callback when destination is updated/deleted
  renderMode?: 'drawer' | 'inline'; // 'inline' renders without Drawer wrapper for split-pane
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatHighlightTag(tag: string): string {
  return tag
    .split(/[-_]/)
    .filter(Boolean)
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

function getLocalTimeString(city: string, timezoneId?: string | null, utcOffset?: number | null): string {
  try {
    let now: Date;
    let timeZone: string | undefined;

    if (timezoneId) {
      timeZone = timezoneId;
      now = new Date();
    } else if (CITY_TIMEZONES[city]) {
      timeZone = CITY_TIMEZONES[city];
      now = new Date();
    } else if (utcOffset !== null && utcOffset !== undefined) {
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
      // Format without timezone (already adjusted)
      return now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).replace(' ', ' ');
    } else {
      return '';
    }

    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).replace(' ', ' ');
  } catch {
    return '';
  }
}

export function DestinationDrawer({ destination, isOpen, onClose, onSaveToggle, onVisitToggle, onDestinationClick, onEdit, onDestinationUpdate, renderMode = 'drawer' }: DestinationDrawerProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isReviewersExpanded, setIsReviewersExpanded] = useState(false);
  const [isContactExpanded, setIsContactExpanded] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddedToTrip, setIsAddedToTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [showInlineAddToTrip, setShowInlineAddToTrip] = useState(false);
  const [addToTripError, setAddToTripError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enhancedDestination, setEnhancedDestination] = useState<Destination | null>(destination);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [loadingNested, setLoadingNested] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [loadingReviewSummary, setLoadingReviewSummary] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [googlePlaceQuery, setGooglePlaceQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editFormData, setEditFormData] = useState({
    slug: '',
    name: '',
    city: '',
    category: '',
    neighborhood: '',
    micro_description: '',
    description: '',
    content: '',
    image: '',
    michelin_stars: null as number | null,
    crown: false,
    brand: '',
    architects: [] as string[], // Changed to array for tag input
    architectural_style: '',
    website: '',
    instagram_handle: '',
    phone_number: '',
    opentable_url: '',
    resy_url: '',
    booking_url: '',
    parent_destination_id: null as number | null,
  });

  const handleAddSuccess = (tripTitle: string, day?: number) => {
    setIsAddedToTrip(true);
    setShowAddToTripModal(false);
    const daySuffix = day ? ` · Day ${day}` : '';
    toast.success(`Added to ${tripTitle}${daySuffix}`);
  };

  // Function to add destination to trip directly
  async function addDestinationToTrip(tripId: string) {
    if (!destination?.slug || !user) return;

    setAddToTripError(null);
    setActionError(null);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Verify trip exists and belongs to user
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('id, title')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        throw new Error('Trip not found or you do not have permission');
      }

      // Get the next day and order_index for this trip
      let nextDay = 1;
      let nextOrder = 0;

      try {
        const { data: orderData, error: functionError } = await supabaseClient
          .rpc('get_next_itinerary_order', { p_trip_id: tripId });

        if (!functionError && orderData) {
          const result = Array.isArray(orderData) ? orderData[0] : orderData;
          if (result && typeof result === 'object') {
            nextDay = result.next_day ?? 1;
            nextOrder = result.next_order ?? 0;
          }
        }
        
        if (functionError || !orderData || (Array.isArray(orderData) && orderData.length === 0)) {
          const { data: existingItems, error: queryError } = await supabaseClient
            .from('itinerary_items')
            .select('day, order_index')
            .eq('trip_id', tripId)
            .order('day', { ascending: false })
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!queryError && existingItems) {
            nextDay = existingItems.day ?? 1;
            nextOrder = (existingItems.order_index ?? -1) + 1;
          }
        }
      } catch (queryErr: any) {
        console.warn('Error getting next order, using defaults:', queryErr);
        nextDay = 1;
        nextOrder = 0;
      }

      // Prepare notes data
      const notesData: ItineraryItemNotes = {
        raw: '',
      };

      // Add destination to itinerary
      const { data: insertedItem, error: insertError } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destination.slug,
          day: nextDay,
          order_index: nextOrder,
          title: destination.name,
          description: null,
          notes: JSON.stringify(notesData),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to add destination to trip');
      }

      if (insertedItem) {
        handleAddSuccess(trip?.title || 'Trip', nextDay);
      }
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      const message = error?.message || 'Failed to add destination to trip. Please try again.';
      setAddToTripError(message);
      toast.error(message);
      // Fallback to showing modal
      setShowAddToTripModal(true);
    }
  }

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

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditMode && destination) {
      // Parse design_firm string to array (comma or semicolon-separated)
      const architectsArray = parseDesignFirms(destination.design_firm);

      setEditFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        neighborhood: destination.neighborhood || '',
        micro_description: destination.micro_description || '',
        description: destination.description || '',
        content: destination.content || '',
        image: destination.image || '',
        michelin_stars: destination.michelin_stars || null,
        crown: destination.crown || false,
        brand: destination.brand || '',
        architects: architectsArray,
        architectural_style: destination.architectural_style || '',
        website: destination.website || '',
        instagram_handle: destination.instagram_handle || '',
        phone_number: destination.phone_number || '',
        opentable_url: destination.opentable_url || '',
        resy_url: destination.resy_url || '',
        booking_url: destination.booking_url || '',
        parent_destination_id: destination.parent_destination_id || null,
      });
      if (destination.image) setImagePreview(destination.image);
    }
  }, [isEditMode, destination]);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setShowDeleteConfirm(false);
      setImageFile(null);
      setImagePreview(null);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);
      formDataToSend.append('slug', editFormData.slug || editFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formDataToSend,
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      return (await res.json()).url;
    } catch (error: any) {
      toast.error(`Image upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.city || !editFormData.category) {
      toast.error('Please fill in name, city, and category');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = editFormData.image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
        else { setIsSaving(false); return; }
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const destinationData = {
        slug: editFormData.slug || editFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: editFormData.name.trim(),
        city: editFormData.city.trim(),
        category: editFormData.category.trim(),
        neighborhood: editFormData.neighborhood?.trim() || null,
        micro_description: editFormData.micro_description?.trim() || null,
        description: editFormData.description?.trim() || null,
        content: editFormData.content?.trim() || null,
        image: imageUrl || null,
        michelin_stars: editFormData.michelin_stars || null,
        crown: editFormData.crown || false,
        brand: editFormData.brand?.trim() || null,
        design_firm: editFormData.architects.length > 0 ? editFormData.architects.join(', ') : null,
        architectural_style: editFormData.architectural_style?.trim() || null,
        website: editFormData.website?.trim() || null,
        instagram_handle: editFormData.instagram_handle?.trim() || null,
        phone_number: editFormData.phone_number?.trim() || null,
        opentable_url: editFormData.opentable_url?.trim() || null,
        resy_url: editFormData.resy_url?.trim() || null,
        booking_url: editFormData.booking_url?.trim() || null,
        parent_destination_id: editFormData.parent_destination_id || null,
      };

      const { error } = await supabase.from('destinations').update(destinationData).eq('slug', destination?.slug);

      if (error) {
        if (error.code === '23505') toast.error('A destination with this slug already exists');
        else throw error;
        return;
      }

      toast.success('Destination updated');
      setIsEditMode(false);
      onDestinationUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!destination?.slug) return;
    if (!showDeleteConfirm) { setShowDeleteConfirm(true); return; }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('destinations').delete().eq('slug', destination.slug);
      if (error) throw error;
      toast.success('Destination deleted');
      onClose();
      onDestinationUpdate?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGooglePlaceSelect = async (placeDetails: any) => {
    const placeId = placeDetails?.place_id || placeDetails?.placeId;
    if (!placeId) return;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ placeId }),
      });

      if (!res.ok) throw new Error('Failed to fetch place details');
      const data = await res.json();

      if (data) {
        setEditFormData(prev => ({
          ...prev,
          name: data.name ?? prev.name,
          city: data.city ?? prev.city,
          category: data.category ?? prev.category,
          description: data.description ?? prev.description,
          image: data.image ?? prev.image,
        }));
        if (data.image) setImagePreview(data.image);
        setGooglePlaceQuery('');
        toast.success('Place details loaded');
      }
    } catch (error) {
      toast.error('Failed to load place details');
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

  // Update enhanced destination when destination prop changes
  useEffect(() => {
    setEnhancedDestination(destination);
  }, [destination]);

  // Load enriched data and saved/visited status
  useEffect(() => {
    async function loadDestinationData() {
      if (!destination) {
        setEnrichedData(null);
        setEnhancedDestination(null);
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

        // Check if destination has a valid slug
        if (!destination?.slug) {
          console.warn('Destination missing slug, skipping enriched data fetch');
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
            google_place_id,
            design_firm,
            architectural_style,
            design_period,
            designer_name,
            architect_info_json,
            web_content_json,
            architect_id,
            design_firm_id,
            interior_designer_id,
            movement_id,
            architectural_significance,
            design_story,
            construction_year,
            architect_ref:architects!architect_id(id, name, slug, bio, birth_year, death_year, nationality, design_philosophy, image_url),
            design_firm_ref:design_firms(id, name, slug, description, founded_year, image_url),
            interior_designer_ref:architects!interior_designer_id(id, name, slug, bio, birth_year, death_year, nationality, image_url),
            movement:design_movements(id, name, slug, description, period_start, period_end)
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
          
          // Merge architect data into destination for ArchitectDesignInfo component
          // Handle architect object (from join) - could be array or single object
          let updatedDestination: Destination & {
            architect_obj?: any;
            design_firm_obj?: any;
            interior_designer_obj?: any;
            movement_obj?: any;
          } = { ...destination };
          
          if (dataObj.architect_ref) {
            const architectObj = Array.isArray(dataObj.architect_ref) && dataObj.architect_ref.length > 0
              ? dataObj.architect_ref[0]
              : dataObj.architect_ref;
            if (architectObj && architectObj.name) {
              updatedDestination = {
                ...updatedDestination,
                architect_id: architectObj.id,
                architect_obj: architectObj,
                design_firm: updatedDestination.design_firm || architectObj.name,
              };
            }
          }

          // Handle design firm ref object (from design_firms table join)
          if (dataObj.design_firm_ref && typeof dataObj.design_firm_ref === 'object' && !Array.isArray(dataObj.design_firm_ref) && dataObj.design_firm_ref.name) {
            const firmObj = dataObj.design_firm_ref;
            updatedDestination = {
              ...updatedDestination,
              design_firm_id: firmObj.id,
              design_firm_obj: firmObj,
            };
          } else if (dataObj.design_firm_ref && Array.isArray(dataObj.design_firm_ref) && dataObj.design_firm_ref.length > 0) {
            const firmObj = dataObj.design_firm_ref[0];
            if (firmObj && firmObj.name) {
              updatedDestination = {
                ...updatedDestination,
                design_firm_id: firmObj.id,
                design_firm_obj: firmObj,
              };
            }
          }

          // Handle interior designer ref object
          if (dataObj.interior_designer_ref) {
            const interiorDesignerObj = Array.isArray(dataObj.interior_designer_ref) && dataObj.interior_designer_ref.length > 0
              ? dataObj.interior_designer_ref[0]
              : dataObj.interior_designer_ref;
            if (interiorDesignerObj && interiorDesignerObj.name) {
              updatedDestination = {
                ...updatedDestination,
                interior_designer_id: interiorDesignerObj.id,
                interior_designer_obj: interiorDesignerObj,
              };
            }
          }
          
          // Handle movement object
          if (dataObj.movement) {
            const movementObj = Array.isArray(dataObj.movement) && dataObj.movement.length > 0
              ? dataObj.movement[0]
              : dataObj.movement;
            if (movementObj && movementObj.name) {
              updatedDestination = {
                ...updatedDestination,
                movement_id: movementObj.id,
                movement_obj: movementObj,
              };
            }
          }
          
          // Merge architectural fields
          if (dataObj.architectural_significance) {
            updatedDestination = { ...updatedDestination, architectural_significance: dataObj.architectural_significance };
          }
          if (dataObj.design_story) {
            updatedDestination = { ...updatedDestination, design_story: dataObj.design_story };
          }
          if (dataObj.construction_year) {
            updatedDestination = { ...updatedDestination, construction_year: dataObj.construction_year };
          }
          
          setEnhancedDestination(updatedDestination);
          
          setEnrichedData(enriched);
          console.log('Enriched data loaded:', enriched);
        } else if (error) {
          console.error('Error fetching enriched data:', error);
          // Set enriched data to null on error to prevent rendering issues
          setEnrichedData(null);
        } else {
          // No error but no data - destination might not exist
          setEnrichedData(null);
        }
      } catch (error) {
        console.error('Error loading enriched data:', error);
        // Set enriched data to null on error to prevent rendering issues
        setEnrichedData(null);
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
          console.log('[DestinationDrawer] Loading nested destinations for destination:', {
            id: destination.id,
            name: destination.name,
            slug: destination.slug
          });
          const nested = await getNestedDestinations(supabaseClient, destination.id, false);
          console.log('[DestinationDrawer] Loaded nested destinations:', {
            count: nested?.length || 0,
            destinations: nested?.map(d => ({ id: d.id, name: d.name, slug: d.slug })) || []
          });
          setNestedDestinations(nested || []);
      } else {
          console.warn('[DestinationDrawer] No destination ID, cannot load nested destinations');
          setNestedDestinations([]);
      }
    } catch (error) {
        console.error('[DestinationDrawer] Error loading nested data:', error);
        setNestedDestinations([]);
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

    setActionError(null);

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
          const message = 'Invalid destination. Please try again.';
          setActionError(message);
          toast.error(message);
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
      setActionError(errorMessage);
      toast.error(errorMessage);
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

  // Always render drawer when open, even if destination is null (show loading state)
  if (!isOpen) return null;

  // Only show loading state if destination is completely null/undefined
  // Allow rendering even if some fields are missing (they'll have fallbacks)
  if (!destination) {
    // Show loading state if destination is null
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        headerContent={
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Details</h2>
          </div>
        }
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading destination...</p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Get rating and price level for display
  const rating = enrichedData?.rating || destination.rating;
  const priceLevel = enrichedData?.price_level || destination.price_level;
  const highlightTags: string[] = (
    Array.isArray(destination.tags) && destination.tags.length > 0
      ? destination.tags
      : Array.isArray(enrichedData?.place_types)
        ? enrichedData.place_types
        : []
  )
    .map((tag: unknown) => (typeof tag === 'string' ? formatHighlightTag(tag) : ''))
    .filter((tag: unknown): tag is string => Boolean(tag))
    .slice(0, 8);

  const defaultMapsQuery = `${destination.name || 'Destination'}, ${destination.city ? capitalizeCity(destination.city) : ''}`;
  const googleMapsDirectionsUrl = destination.google_maps_url
    || (destination.latitude && destination.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
      : null);
  const appleMapsDirectionsUrl = `https://maps.apple.com/?q=${encodeURIComponent(defaultMapsQuery)}`;
  const directionsUrl = googleMapsDirectionsUrl || appleMapsDirectionsUrl;

  // Create custom header content - Place Drawer spec
  const headerContent = (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4 text-gray-900 dark:text-white" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {isEditMode ? 'Edit Destination' : (destination.name || 'Destination')}
        </h2>
      </div>
      {user && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Admin Edit Button */}
          {isAdmin && destination && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditMode(!isEditMode);
              }}
              className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
              aria-label={isEditMode ? 'Exit edit mode' : 'Edit destination'}
              title={isEditMode ? 'Exit edit mode' : 'Edit destination (Admin)'}
            >
              <Edit className={`h-4 w-4 ${isEditMode ? '' : 'text-gray-900 dark:text-white/90'}`} strokeWidth={1.5} />
            </button>
          )}
          {/* Bookmark Action */}
          <button
            onClick={async () => {
              if (!user) {
                router.push('/auth/login');
                return;
              }
              if (!isSaved) {
                setShowSaveModal(true);
              } else {
                try {
                  const supabaseClient = createClient();
                  if (!supabaseClient) return;
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save destination'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} strokeWidth={1.5} />
          </button>
          {/* Trip Action - toggles inline panel in footer */}
          <button
            onClick={() => {
              if (!user) {
                router.push('/auth/login');
                return;
              }
              if (isAddedToTrip) return;
              // Toggle the inline Add to Trip panel
              setShowInlineAddToTrip(!showInlineAddToTrip);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Add to trip"
            disabled={isAddedToTrip}
          >
            {isAddedToTrip ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Shared footer content renderer to reduce duplication
  const renderFooterContent = (isMobile: boolean) => (
    <div className="px-6 py-4 space-y-3">
      {/* View Full Details button */}
      {destination.slug && (
        <Link
          href={`/destination/${destination.slug}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={isMobile
            ? "block w-full rounded-lg bg-gray-900 py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
            : "block w-full bg-black dark:bg-white text-white dark:text-black text-center py-3 px-4 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
          }
        >
          View Full Details
        </Link>
      )}

      {/* Inline Add to Trip Panel */}
      <InlineAddToTrip
        destinationSlug={destination.slug}
        destinationName={destination.name}
        isExpanded={showInlineAddToTrip}
        onExpandedChange={setShowInlineAddToTrip}
        onSuccess={(tripTitle, day) => {
          setIsAddedToTrip(true);
          const daySuffix = day ? ` · Day ${day}` : '';
          toast.success(`Added to ${tripTitle}${daySuffix}`);
        }}
        onError={(message) => {
          setAddToTripError(message);
          toast.error(message);
        }}
        isAddedToTrip={isAddedToTrip}
      />
    </div>
  );

  const mobileFooterContent = renderFooterContent(true);
  const desktopFooterContent = renderFooterContent(false);

  // Main content that can be rendered in drawer or inline
  const mainContent = (
    <div className="p-6">
          {(addToTripError || actionError) && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 flex gap-2 text-xs text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="space-y-0.5">
                {addToTripError && <p className="font-medium">{addToTripError}</p>}
                {actionError && <p className="font-medium">{actionError}</p>}
                <p className="text-xs text-red-700/80 dark:text-red-200/80">You can retry without closing the drawer.</p>
              </div>
            </div>
          )}

          {/* EDIT MODE FORM */}
          {isEditMode ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Google Places Search */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Search Google Places</label>
                <GooglePlacesAutocompleteNative
                  value={googlePlaceQuery}
                  onChange={setGooglePlaceQuery}
                  onPlaceSelect={handleGooglePlaceSelect}
                  placeholder="Search Google Places..."
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  types={['establishment']}
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="Place name"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">City *</label>
                <CityAutocompleteInput
                  value={editFormData.city}
                  onChange={(value) => setEditFormData(prev => ({ ...prev, city: value }))}
                  placeholder="City"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Category *</label>
                <CategoryAutocompleteInput
                  value={editFormData.category}
                  onChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                  placeholder="Category"
                  required
                />
              </div>

              {/* Neighborhood */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Neighborhood</label>
                <input
                  type="text"
                  value={editFormData.neighborhood}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="e.g., Shibuya, SoHo"
                />
              </div>

              {/* Micro Description */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Micro Description</label>
                <input
                  type="text"
                  value={editFormData.micro_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, micro_description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="One-line description for cards"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm resize-none"
                  placeholder="Short description..."
                />
              </div>

              {/* Content (longer form) */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Content</label>
                <textarea
                  value={editFormData.content}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm resize-none"
                  placeholder="Detailed content..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
                    isDragging ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="edit-image-upload" />
                  <label htmlFor="edit-image-upload" className="flex flex-col items-center cursor-pointer">
                    {imagePreview ? (
                      <div className="relative w-full">
                        <img src={imagePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); setEditFormData(prev => ({ ...prev, image: '' })); }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Drop image or click to upload</span>
                    )}
                  </label>
                </div>
                {uploadingImage && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </div>
                )}
              </div>

              {/* Michelin Stars */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Michelin Stars</label>
                <select
                  value={editFormData.michelin_stars || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, michelin_stars: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">None</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                </select>
              </div>

              {/* Crown */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-crown"
                  checked={editFormData.crown}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, crown: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="edit-crown" className="text-sm text-gray-600 dark:text-gray-400">Crown (Featured)</label>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Brand</label>
                <input
                  type="text"
                  value={editFormData.brand}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="e.g., Four Seasons, Aman"
                />
              </div>

              {/* Architect */}
              <ArchitectTagInput
                label="Architects"
                value={editFormData.architects}
                onChange={(architects) => setEditFormData(prev => ({ ...prev, architects }))}
                placeholder="Add architect..."
              />

              {/* Architectural Style */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Architectural Style</label>
                <input
                  type="text"
                  value={editFormData.architectural_style}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, architectural_style: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="e.g., Brutalist, Minimalist"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Website</label>
                <input
                  type="url"
                  value={editFormData.website}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://..."
                />
              </div>

              {/* Instagram Handle */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Instagram Handle</label>
                <input
                  type="text"
                  value={editFormData.instagram_handle}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="@handle"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Phone Number</label>
                <input
                  type="tel"
                  value={editFormData.phone_number}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="+1 234 567 8900"
                />
              </div>

              {/* Booking URLs */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">OpenTable URL</label>
                <input
                  type="url"
                  value={editFormData.opentable_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, opentable_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://opentable.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Resy URL</label>
                <input
                  type="url"
                  value={editFormData.resy_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, resy_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://resy.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Booking URL</label>
                <input
                  type="url"
                  value={editFormData.booking_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, booking_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm"
                  placeholder="https://booking.com/..."
                />
              </div>

              {/* Parent Destination */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Located In (Parent)</label>
                <ParentDestinationAutocompleteInput
                  value={editFormData.parent_destination_id}
                  onChange={(id) => setEditFormData(prev => ({ ...prev, parent_destination_id: id }))}
                  currentDestinationId={destination?.id}
                  placeholder="Search parent location..."
                />
              </div>

              {/* Delete Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                {showDeleteConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-gray-600 dark:text-gray-400">Delete "{destination.name}"?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm">
                        Cancel
                      </button>
                      <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={handleDelete} className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm flex items-center justify-center gap-2">
                    <Trash2 className="h-4 w-4" /> Delete Destination
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editFormData.name || !editFormData.city || !editFormData.category}
                  className="flex-1 bg-black dark:bg-white text-white dark:text-black rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
          <>
          {/* Mobile Content - Same as Desktop */}
          <div className="md:hidden">
          {/* Hero Image - Full width rounded */}
          {destination.image && (
            <div className="mt-[18px] rounded-lg overflow-hidden aspect-[4/3]">
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

          {/* Primary Info Block */}
          <div className="space-y-4 mt-6">
            {/* City Link - Pill style */}
            <div>
              <a
                href={`/city/${destination.city}`}
                className="inline-flex items-center px-3 h-[28px] rounded-lg border border-gray-200 dark:border-white/20 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-[#1A1C1F] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/city/${destination.city}`);
                }}
              >
                {destination.country ? `${capitalizeCity(destination.city)}, ${destination.country}` : capitalizeCity(destination.city)}
              </a>
            </div>

          {/* Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-medium leading-tight text-black dark:text-white">
                {destination.name}
              </h1>

              {/* Category - Subtle caps */}
              {destination.category && (
                <div className="text-xs uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 font-medium">
                  {destination.category}
                </div>
              )}

              {/* Rating - Bold rating with Google logo */}
              {(enrichedData?.rating || destination.rating) && (
                <div className="flex items-center gap-1.5">
                  <img
                    src="/google-logo.svg"
                    alt="Google rating"
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {(enrichedData?.rating || destination.rating).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Tags - Small pills */}
              {destination.tags && Array.isArray(destination.tags) && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {destination.tags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-400">
                      {formatHighlightTag(tag)}
                    </span>
                  ))}
                </div>
              )}

              {/* Other Pills: Brand, Crown, Michelin */}
              <div className="flex flex-wrap gap-2">

                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}

                {destination.crown && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                    Crown
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
                  </span>
            )}

                {(enrichedData?.rating || destination.rating) && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="/google-logo.svg"
                    alt="Google rating"
                    className="h-3 w-3"
                  />
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                    </span>
              )}

              {/* Instagram Handle */}
              {(destination.instagram_handle || destination.instagram_url) && (() => {
                const instagramHandle = destination.instagram_handle || 
                  (destination.instagram_url 
                    ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
                    : null);
                const instagramUrl = destination.instagram_url || 
                  (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);
                
                if (!instagramHandle || !instagramUrl) return null;
                
                return (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3 w-3" />
                    @{instagramHandle.replace('@', '')}
                  </a>
                );
              })()}
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
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={async (e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved && destination?.slug) {
                        // Quick save to saved_places immediately
                        e.preventDefault();
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
                              // Also open modal to optionally save to collection
                              setShowSaveModal(true);
                            } else {
                              console.error('Error saving place:', error);
                              const message = 'Failed to save. Please try again.';
                              setActionError(message);
                              toast.error(message);
                            }
                          }
                        } catch (error) {
                          console.error('Error saving place:', error);
                          const message = 'Failed to save. Please try again.';
                          setActionError(message);
                          toast.error(message);
                        }
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
                          const message = 'Failed to unsave. Please try again.';
                          setActionError(message);
                          toast.error(message);
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
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
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
                      className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
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
                <Link
                  href={`/destination/${destination.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Page
                </Link>
              ) : null}
                  </div>
                </div>

          {/* Sign in prompt */}
          {!user && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign in to save and track visits
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* Meta & Info Section - Same as Desktop */}
          <div className="space-y-6">
            {/* Parent destination context - Horizontal card */}
            {parentDestination && (
              <button
                onClick={() => {
                  if (parentDestination.slug && onDestinationClick) {
                    onDestinationClick(parentDestination.slug);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
              >
                {/* Square Image */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {parentDestination.image ? (
                    <Image
                      src={parentDestination.image}
                      alt={parentDestination.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-6 w-6" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Located inside</p>
                  <p className="font-medium text-sm text-black dark:text-white truncate group-hover:underline">{parentDestination.name}</p>
                  {parentDestination.category && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{parentDestination.category}</p>
                  )}
                </div>
              </button>
            )}

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                {destination.tags.map((tag, index) => (
                    <span
                    key={index}
                    className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400"
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
              </div>
            )}

            {/* Hours & Contact Section with Local Time */}
            {(() => {
              const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours || (destination as any).opening_hours_json;
              const hasHours = hours && hours.weekday_text && Array.isArray(hours.weekday_text) && hours.weekday_text.length > 0;
              const hasContact = enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url || destination.opentable_url || destination.resy_url || destination.booking_url;

              if (!hasHours && !hasContact) {
                return null;
              }

              const localTime = getLocalTimeString(
                destination.city,
                enrichedData?.timezone_id,
                enrichedData?.utc_offset
              );

              const openStatus = hasHours ? getOpenStatus(
                hours,
                destination.city,
                enrichedData?.timezone_id,
                enrichedData?.utc_offset
              ) : null;

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
                <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                  {/* Section Header with Local Time */}
                  <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    Hours & Contact
                    {localTime && (
                      <span className="font-normal text-gray-400 dark:text-gray-500">
                        · {localTime} local
                      </span>
                    )}
                  </h3>

                  {/* Opening Hours */}
                  {hasHours && openStatus && (
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          {openStatus.todayHours && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-medium ${
                                openStatus.isOpen
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                              }`}>
                                {openStatus.isOpen ? 'Open now' : 'Closed'}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {openStatus.todayHours}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {hours.weekday_text && (
                        <details className="group">
                          <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            View all hours
                          </summary>
                          <div className="mt-3 space-y-2 pl-5">
                            {hours.weekday_text.map((day: string, index: number) => {
                              const [dayName, hoursText] = day.split(': ');
                              const dayOfWeek = now.getDay();
                              const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                              const isToday = index === googleDayIndex;

                              return (
                                <div key={index} className={`flex justify-between items-center text-sm ${
                                  isToday
                                    ? 'font-medium text-black dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  <span className={isToday ? 'text-black dark:text-white' : ''}>{dayName}</span>
                                  <span className={isToday ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}>{hoursText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Contact Links */}
                  {hasContact && (
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
                      {(enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone) && (
                        <a
                          href={`tel:${enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}`}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}
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
                      {destination.opentable_url && (
                        <a
                          href={destination.opentable_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          OpenTable
                        </a>
                      )}
                      {destination.resy_url && (
                        <a
                          href={destination.resy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Resy
                        </a>
                      )}
                      {destination.booking_url && (
                        <a
                          href={destination.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Book Now
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity || destination.neighborhood || destination.city || destination.country) && (
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black dark:text-white mb-2">Location</div>
                    {/* Neighborhood, City, Country - Better organized */}
                    {((!parentDestination && destination.neighborhood) || destination.city || destination.country) && (
                      <div className="space-y-1 mb-2">
                        {!parentDestination && destination.neighborhood && (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {destination.neighborhood}
                          </div>
                        )}
                        {(destination.city || destination.country) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {destination.city && capitalizeCity(destination.city)}
                            {destination.city && destination.country && ', '}
                            {destination.country && destination.country}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Full Address */}
                    {enrichedData?.formatted_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{enrichedData.formatted_address}</div>
                    )}
                    {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">{enrichedData.vicinity}</div>
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
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="h-3 w-3" />
                Directions
              </a>
              <button
                onClick={handleShare}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="h-3 w-3" />
                {copied ? 'Copied!' : 'Share'}
              </button>
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
                        if (nested.slug && onDestinationClick) {
                          onDestinationClick(nested.slug);
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
                {htmlToPlainText(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {htmlToPlainText(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          {enhancedDestination && <ArchitectDesignInfo destination={enhancedDestination} />}

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
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
                      </div>
              ) : null}
            </div>
          )}

          {/* Map Section - Small static map */}
          {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <GoogleStaticMap
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  height="192px"
                  className="rounded-lg"
                  showPin={true}
                />
              </div>
            </div>
          )}

          {/* Similar Places - Single Row, Max 4 Cards */}
          <SimilarPlacesGrid
            recommendations={recommendations}
            loading={loadingRecommendations}
            destinationSlug={destination.slug}
            onDestinationClick={onDestinationClick}
            onClose={onClose}
          />

          </div>
          </div>

          {/* Desktop Content */}
          <div className="hidden md:block">
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
                className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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

              {/* Pills: Category, Brand, Crown, Michelin, Google Rating */}
              <div className="flex flex-wrap gap-2">
              {destination.category && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {destination.category}
                    </span>
                )}

                {destination.brand && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                    <Building2 className="h-3.5 w-3.5" />
                    {destination.brand}
                  </span>
                )}

                {destination.crown && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                    Crown
                </span>
              )}

              {destination.michelin_stars && destination.michelin_stars > 0 && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                  />
                  {destination.michelin_stars} Michelin star{destination.michelin_stars > 1 ? 's' : ''}
                  </span>
            )}

                {(enrichedData?.rating || destination.rating) && (
                  <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <img
                    src="/google-logo.svg"
                    alt="Google rating"
                    className="h-3 w-3"
                  />
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                    </span>
              )}

              {/* Instagram Handle */}
              {(destination.instagram_handle || destination.instagram_url) && (() => {
                const instagramHandle = destination.instagram_handle || 
                  (destination.instagram_url 
                    ? destination.instagram_url.match(/instagram\.com\/([^/?]+)/)?.[1]?.replace('@', '')
                    : null);
                const instagramUrl = destination.instagram_url || 
                  (instagramHandle ? `https://www.instagram.com/${instagramHandle.replace('@', '')}/` : null);
                
                if (!instagramHandle || !instagramUrl) return null;
                
                return (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-3 w-3" />
                    @{instagramHandle.replace('@', '')}
                  </a>
                );
              })()}
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
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    onClick={async (e) => {
                      if (!user) {
                        e.preventDefault();
                        router.push('/auth/login');
                        return;
                      }
                      if (!isSaved && destination?.slug) {
                        // Quick save to saved_places immediately
                        e.preventDefault();
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
                              // Also open modal to optionally save to collection
                              setShowSaveModal(true);
                            } else {
                              console.error('Error saving place:', error);
                              const message = 'Failed to save. Please try again.';
                              setActionError(message);
                              toast.error(message);
                            }
                          }
                        } catch (error) {
                          console.error('Error saving place:', error);
                          const message = 'Failed to save. Please try again.';
                          setActionError(message);
                          toast.error(message);
                        }
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
                          const message = 'Failed to unsave. Please try again.';
                          setActionError(message);
                          toast.error(message);
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
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
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
                      className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
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
                <Link
                  href={`/destination/${destination.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Page
                </Link>
              ) : null}
                  </div>
                </div>

          {/* Sign in prompt */}
          {!user && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Sign in to save and track visits
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />

          {/* Meta & Info Section */}
          <div className="space-y-6">
            {/* Parent destination context - Horizontal card */}
            {parentDestination && (
              <button
                onClick={() => {
                  if (parentDestination.slug && onDestinationClick) {
                    onDestinationClick(parentDestination.slug);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
              >
                {/* Square Image */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {parentDestination.image ? (
                    <Image
                      src={parentDestination.image}
                      alt={parentDestination.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-6 w-6" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Located inside</p>
                  <p className="font-medium text-sm text-black dark:text-white truncate group-hover:underline">{parentDestination.name}</p>
                  {parentDestination.category && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{parentDestination.category}</p>
                  )}
                </div>
              </button>
            )}

            {/* AI-Generated Tags */}
            {destination.tags && destination.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                {destination.tags.map((tag, index) => (
                    <span
                    key={index}
                    className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400"
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
              </div>
            )}

            {/* Hours & Contact Section with Local Time */}
            {(() => {
              const hours = enrichedData?.current_opening_hours || enrichedData?.opening_hours || (destination as any).opening_hours_json;
              const hasHours = hours && hours.weekday_text && Array.isArray(hours.weekday_text) && hours.weekday_text.length > 0;
              const hasContact = enrichedData?.website || enrichedData?.international_phone_number || destination.website || destination.phone_number || destination.instagram_url || destination.opentable_url || destination.resy_url || destination.booking_url;

              if (!hasHours && !hasContact) {
                return null;
              }

              const localTime = getLocalTimeString(
                destination.city,
                enrichedData?.timezone_id,
                enrichedData?.utc_offset
              );

              const openStatus = hasHours ? getOpenStatus(
                hours,
                destination.city,
                enrichedData?.timezone_id,
                enrichedData?.utc_offset
              ) : null;

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
                <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
                  {/* Section Header with Local Time */}
                  <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    Hours & Contact
                    {localTime && (
                      <span className="font-normal text-gray-400 dark:text-gray-500">
                        · {localTime} local
                      </span>
                    )}
                  </h3>

                  {/* Opening Hours */}
                  {hasHours && openStatus && (
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          {openStatus.todayHours && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-medium ${
                                openStatus.isOpen
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                              }`}>
                                {openStatus.isOpen ? 'Open now' : 'Closed'}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {openStatus.todayHours}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {hours.weekday_text && (
                        <details className="group">
                          <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            View all hours
                          </summary>
                          <div className="mt-3 space-y-2 pl-5">
                            {hours.weekday_text.map((day: string, index: number) => {
                              const [dayName, hoursText] = day.split(': ');
                              const dayOfWeek = now.getDay();
                              const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                              const isToday = index === googleDayIndex;

                              return (
                                <div key={index} className={`flex justify-between items-center text-sm ${
                                  isToday
                                    ? 'font-medium text-black dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  <span className={isToday ? 'text-black dark:text-white' : ''}>{dayName}</span>
                                  <span className={isToday ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}>{hoursText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Contact Links */}
                  {hasContact && (
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
                      {(enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone) && (
                        <a
                          href={`tel:${enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}`}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {enrichedData?.international_phone_number || destination.phone_number || destination.reservation_phone}
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
                      {destination.opentable_url && (
                        <a
                          href={destination.opentable_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          OpenTable
                        </a>
                      )}
                      {destination.resy_url && (
                        <a
                          href={destination.resy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Resy
                        </a>
                      )}
                      {destination.booking_url && (
                        <a
                          href={destination.booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Book Now
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Address */}
            {(enrichedData?.formatted_address || enrichedData?.vicinity || destination.neighborhood || destination.city || destination.country) && (
              <div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black dark:text-white mb-2">Location</div>
                    {/* Neighborhood, City, Country - Better organized */}
                    {((!parentDestination && destination.neighborhood) || destination.city || destination.country) && (
                      <div className="space-y-1 mb-2">
                        {!parentDestination && destination.neighborhood && (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {destination.neighborhood}
                          </div>
                        )}
                        {(destination.city || destination.country) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {destination.city && capitalizeCity(destination.city)}
                            {destination.city && destination.country && ', '}
                            {destination.country && destination.country}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Full Address */}
                    {enrichedData?.formatted_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{enrichedData.formatted_address}</div>
                    )}
                    {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">{enrichedData.vicinity}</div>
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
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                <Navigation className="h-3 w-3" />
                Directions
              </a>
              <button
                onClick={handleShare}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
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
                        if (nested.slug && onDestinationClick) {
                          onDestinationClick(nested.slug);
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
                {htmlToPlainText(destination.description)}
              </div>
            </div>
          )}

          {/* Editorial Summary */}
          {enrichedData?.editorial_summary && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">From Google</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {htmlToPlainText(enrichedData.editorial_summary)}
              </p>
            </div>
          )}

          {/* Architecture & Design */}
          {enhancedDestination && <ArchitectDesignInfo destination={enhancedDestination} />}

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
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reviewSummary}</p>
                      </div>
              ) : null}
            </div>
          )}

          {/* Map Section - Small static map */}
          {((destination.latitude || enrichedData?.latitude) && (destination.longitude || enrichedData?.longitude)) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-xs font-bold uppercase mb-3 text-gray-500 dark:text-gray-400">Location</h3>
              <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <GoogleStaticMap
                  center={{
                    lat: destination.latitude || enrichedData?.latitude || 0,
                    lng: destination.longitude || enrichedData?.longitude || 0,
                  }}
                  zoom={15}
                  height="192px"
                  className="rounded-lg"
                  showPin={true}
                />
              </div>
            </div>
          )}

          {/* Similar Places - Single Row, Max 4 Cards (Desktop) */}
          <SimilarPlacesGrid
            recommendations={recommendations}
            loading={loadingRecommendations}
            destinationSlug={destination.slug}
            onDestinationClick={onDestinationClick}
            onClose={onClose}
          />

          </div>
          </>
          )}
        </div>
  );

  // Return based on render mode
  if (renderMode === 'inline') {
    // Inline mode for split-pane - render without Drawer wrapper
    if (!isOpen) return null;

    return (
      <>
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
          {/* Inline Header */}
          {headerContent}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {mainContent}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
            {desktopFooterContent}
          </div>
        </div>

        {/* Modals still need to be rendered */}
        {destination?.id && (
          <SaveDestinationModal
            destinationId={destination.id}
            destinationSlug={destination.slug}
            isOpen={showSaveModal}
            onClose={async () => {
              setShowSaveModal(false);
              if (user && destination?.slug) {
                try {
                  const supabase = createClient();
                  const { data } = await supabase
                    .from('saved_places')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('destination_slug', destination.slug)
                    .maybeSingle();
                  setIsSaved(!!data);
                } catch (error) {
                  console.error('Error checking saved status:', error);
                }
              }
            }}
          />
        )}
        {destination && (
          <VisitedModal
            destinationSlug={destination.slug}
            destinationName={destination.name}
            isOpen={showVisitedModal}
            onClose={() => setShowVisitedModal(false)}
            onUpdate={async () => {
              setShowVisitedModal(false);
              setIsVisited(true);
              if (destination.slug) {
                onVisitToggle?.(destination.slug, true);
              }
            }}
          />
        )}
      </>
    );
  }

  // Default drawer mode
  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        mobileVariant="side"
        desktopSpacing="right-4 top-4 bottom-4"
        desktopWidth="420px"
        position="right"
        style="glassy"
        backdropOpacity="18"
        keepStateOnClose={true}
        zIndex={9999}
        headerContent={headerContent}
        footerContent={
          <>
            {/* Mobile Footer */}
            <div className="md:hidden">{mobileFooterContent}</div>
            {/* Desktop Footer */}
            <div className="hidden md:block">{desktopFooterContent}</div>
          </>
        }
      >
        {mainContent}
      </Drawer>

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

    </>
  );
}
