'use client';

import { useState, useCallback, useEffect, memo, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Star,
  Bookmark,
  Share2,
  Navigation,
  ExternalLink,
  Clock,
  Phone,
  Globe,
  Building2,
  ChevronRight,
  Check,
  Plus,
  Loader2,
  Edit,
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { CITY_TIMEZONES } from '@/lib/constants';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/ui/sonner';
import { InlineAddToTrip } from '@/features/detail/InlineAddToTrip';

// ============================================
// SMART CATEGORY DETECTION
// ============================================

type CategoryType = 'dining' | 'hotel' | 'culture' | 'nightlife' | 'shopping' | 'outdoor' | 'architecture' | 'general';

function getCategoryType(category?: string): CategoryType {
  if (!category) return 'general';
  const c = category.toLowerCase();

  // Dining: restaurants, cafes, bakeries, food
  if (c.includes('restaurant') || c.includes('cafe') || c.includes('coffee') ||
      c.includes('bakery') || c.includes('food') || c.includes('dining') ||
      c.includes('bistro') || c.includes('eatery') || c.includes('pizzeria') ||
      c.includes('sushi') || c.includes('ramen') || c.includes('brunch')) {
    return 'dining';
  }

  // Hotels & Stays
  if (c.includes('hotel') || c.includes('hostel') || c.includes('resort') ||
      c.includes('ryokan') || c.includes('inn') || c.includes('lodge') ||
      c.includes('stay') || c.includes('accommodation')) {
    return 'hotel';
  }

  // Culture: museums, galleries, temples, landmarks
  if (c.includes('museum') || c.includes('gallery') || c.includes('temple') ||
      c.includes('shrine') || c.includes('church') || c.includes('landmark') ||
      c.includes('monument') || c.includes('historic') || c.includes('palace')) {
    return 'culture';
  }

  // Nightlife: bars, clubs
  if (c.includes('bar') || c.includes('club') || c.includes('cocktail') ||
      c.includes('pub') || c.includes('lounge') || c.includes('speakeasy') ||
      c.includes('wine') || c.includes('sake')) {
    return 'nightlife';
  }

  // Shopping
  if (c.includes('shop') || c.includes('store') || c.includes('market') ||
      c.includes('boutique') || c.includes('mall') || c.includes('retail')) {
    return 'shopping';
  }

  // Outdoor: parks, gardens, nature
  if (c.includes('park') || c.includes('garden') || c.includes('nature') ||
      c.includes('beach') || c.includes('trail') || c.includes('outdoor')) {
    return 'outdoor';
  }

  // Architecture
  if (c.includes('architecture') || c.includes('building') || c.includes('tower') ||
      c.includes('bridge') || c.includes('structure')) {
    return 'architecture';
  }

  return 'general';
}

// ============================================
// LOCAL TIME HELPER
// ============================================

/**
 * Get local time at destination for context
 * Returns formatted time string like "10:30 AM local"
 * Uses timezone_id or city timezone mapping for accuracy
 */
function getLocalTimeAtDestination(
  utcOffsetMinutes: number | null | undefined,
  city?: string | null,
  timezoneId?: string | null
): string | null {
  const now = new Date();

  // Best: Use timezone_id (handles DST automatically)
  if (timezoneId) {
    try {
      return now.toLocaleTimeString('en-US', {
        timeZone: timezoneId,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      // Invalid timezone, fall through
    }
  }

  // Good: Use city timezone mapping
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        return now.toLocaleTimeString('en-US', {
          timeZone: cityTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        // Invalid timezone, fall through
      }
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${hour12}:${minuteStr} ${ampm}`;
  }

  return null;
}

/**
 * Get destination local hour and day of week
 * Uses timezone_id, city timezone mapping, or utc_offset for accuracy
 * Falls back to UTC (not user's local time) if no timezone info available
 */
function getDestinationLocalTime(
  utcOffsetMinutes: number | null | undefined,
  city?: string | null,
  timezoneId?: string | null
): { hour: number; dayOfWeek: number; isWeekend: boolean } {
  const now = new Date();

  // Best: Use timezone_id (handles DST automatically)
  if (timezoneId) {
    try {
      const localString = now.toLocaleString('en-US', { timeZone: timezoneId });
      const localTime = new Date(localString);
      const hour = localTime.getHours();
      const dayOfWeek = localTime.getDay();
      return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
    } catch {
      // Invalid timezone, fall through
    }
  }

  // Good: Use city timezone mapping
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        const localString = now.toLocaleString('en-US', { timeZone: cityTimezone });
        const localTime = new Date(localString);
        const hour = localTime.getHours();
        const dayOfWeek = localTime.getDay();
        return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
      } catch {
        // Invalid timezone, fall through
      }
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    const hour = localTime.getHours();
    const dayOfWeek = localTime.getDay();
    return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
  }

  // Fallback: Use UTC (not user's local time for consistency)
  const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const utcTime = new Date(utcString);
  const hour = utcTime.getHours();
  const dayOfWeek = utcTime.getDay();
  return { hour, dayOfWeek, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
}

// ============================================
// SUBTLE INTELLIGENCE - Works automatically
// ============================================

interface SubtleContext {
  timeSignal?: string;      // "Perfect for dinner right now"
  priceSignal?: string;     // "Above average for the area"
  availabilityHint?: string; // "Usually busy on weekends"
  proximityHint?: string;   // "5 min walk" (if we have location)
  mealContext?: 'breakfast' | 'lunch' | 'dinner' | 'late-night' | null;
  urgencyLevel?: 'low' | 'medium' | 'high';
}

/**
 * Analyze context subtly based on time, category, and data
 * No user interaction required - just works
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function getSubtleContext(
  categoryType: CategoryType,
  priceLevel?: number,
  rating?: number,
  reviewCount?: number,
  isOpen?: boolean | null,
  utcOffsetMinutes?: number | null,
  city?: string | null
): SubtleContext {
  // Use destination's local time, not user's
  const { hour, isWeekend } = getDestinationLocalTime(utcOffsetMinutes, city);
  const context: SubtleContext = {};

  // Determine meal context based on time
  if (hour >= 6 && hour < 11) context.mealContext = 'breakfast';
  else if (hour >= 11 && hour < 15) context.mealContext = 'lunch';
  else if (hour >= 17 && hour < 22) context.mealContext = 'dinner';
  else if (hour >= 22 || hour < 4) context.mealContext = 'late-night';

  // Time-aware signals for dining
  if (categoryType === 'dining') {
    if (context.mealContext === 'dinner' && isOpen) {
      context.timeSignal = 'Great timing for dinner';
    } else if (context.mealContext === 'lunch' && isOpen) {
      context.timeSignal = 'Good for lunch';
    } else if (context.mealContext === 'breakfast' && isOpen) {
      context.timeSignal = 'Open for breakfast';
    }

    // Availability hints based on rating/reviews
    if (reviewCount && reviewCount > 500 && rating && rating >= 4.5) {
      context.availabilityHint = 'Popular spot';
      context.urgencyLevel = 'high';
    } else if (reviewCount && reviewCount > 200) {
      context.availabilityHint = isWeekend ? 'Busy on weekends' : undefined;
    }
  }

  // Nightlife time signals
  if (categoryType === 'nightlife') {
    if (hour >= 17 && hour < 20) {
      context.timeSignal = 'Happy hour';
    } else if (hour >= 21 && hour < 24) {
      context.timeSignal = 'Prime time';
    } else if (hour >= 0 && hour < 3) {
      context.timeSignal = 'Late night';
    }
  }

  // Culture/museum signals
  if (categoryType === 'culture') {
    if (hour >= 9 && hour < 11 && !isWeekend) {
      context.timeSignal = 'Quiet hours';
    } else if (isWeekend && hour >= 11 && hour < 16) {
      context.availabilityHint = 'Peak visitor hours';
    }
  }

  // Price context (subtle, relative)
  if (priceLevel) {
    if (priceLevel >= 4) {
      context.priceSignal = 'Splurge-worthy';
    } else if (priceLevel === 1) {
      context.priceSignal = 'Budget-friendly';
    }
    // Don't show anything for average prices - that's the default expectation
  }

  return context;
}

/**
 * Get a subtle recommendation reason based on context
 * Returns null if nothing notable - silence is golden
 */
function getSubtleRecommendation(
  categoryType: CategoryType,
  destination: Destination,
  userVisitedCount?: number,
  hasArchitect?: boolean
): string | null {
  // Only show if there's something genuinely notable
  if (destination.michelin_stars && destination.michelin_stars > 0) {
    return null; // Michelin badge already shows this
  }

  if (destination.crown) {
    return 'Editor\'s pick';
  }

  if (hasArchitect && categoryType === 'architecture') {
    return null; // Architecture section already highlights this
  }

  if (userVisitedCount && userVisitedCount >= 5 && categoryType === 'dining') {
    return 'Matches your taste';
  }

  return null;
}

// Section priority by category type (lower = higher priority)
const SECTION_PRIORITIES: Record<CategoryType, Record<string, number>> = {
  dining: {
    hours: 1,      // Most important for restaurants
    contact: 2,
    description: 3,
    parent: 4,
    nested: 5,
    architecture: 6,
    map: 7,
    trip: 8,
    similar: 9,
    related: 10,
  },
  hotel: {
    contact: 1,    // Address/phone first for hotels
    description: 2,
    nested: 3,     // Show venues inside hotel
    hours: 4,
    architecture: 5,
    map: 6,
    trip: 7,
    similar: 8,
    parent: 9,
    related: 10,
  },
  culture: {
    description: 1, // Story matters for museums
    hours: 2,
    architecture: 3,
    contact: 4,
    nested: 5,
    parent: 6,
    map: 7,
    trip: 8,
    similar: 9,
    related: 10,
  },
  nightlife: {
    hours: 1,      // When it's open matters
    description: 2,
    contact: 3,
    architecture: 4,
    map: 5,
    trip: 6,
    similar: 7,
    parent: 8,
    nested: 9,
    related: 10,
  },
  architecture: {
    architecture: 1, // Architect info is primary
    description: 2,
    hours: 3,
    contact: 4,
    nested: 5,
    parent: 6,
    map: 7,
    trip: 8,
    similar: 9,
    related: 10,
  },
  shopping: {
    hours: 1,
    contact: 2,
    description: 3,
    map: 4,
    trip: 5,
    similar: 6,
    architecture: 7,
    parent: 8,
    nested: 9,
    related: 10,
  },
  outdoor: {
    description: 1,
    map: 2,        // Location matters for outdoor
    hours: 3,
    contact: 4,
    trip: 5,
    similar: 6,
    architecture: 7,
    parent: 8,
    nested: 9,
    related: 10,
  },
  general: {
    description: 1,
    hours: 2,
    contact: 3,
    architecture: 4,
    nested: 5,
    parent: 6,
    map: 7,
    trip: 8,
    similar: 9,
    related: 10,
  },
};

// Lazy load map
const GoogleStaticMap = dynamic(() => import('@/features/maps/components/GoogleStaticMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
});

// ============================================
// SKELETON COMPONENTS
// ============================================

const SkeletonPulse = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const SectionSkeleton = ({ type }: { type: string }) => {
  switch (type) {
    case 'description':
      return (
        <div className="mt-5 space-y-2">
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-5/6" />
          <SkeletonPulse className="h-4 w-4/6" />
        </div>
      );
    case 'hours':
      return (
        <div className="mt-6 space-y-3">
          <SkeletonPulse className="h-3 w-24" />
          <div className="flex items-center gap-3">
            <SkeletonPulse className="h-4 w-4" />
            <SkeletonPulse className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonPulse className="h-4 w-4" />
            <SkeletonPulse className="h-4 w-52" />
          </div>
        </div>
      );
    case 'architecture':
      return (
        <div className="mt-6 space-y-2">
          <SkeletonPulse className="h-3 w-32" />
          <div className="flex items-center gap-3 py-2">
            <SkeletonPulse className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <SkeletonPulse className="h-3 w-16" />
              <SkeletonPulse className="h-4 w-32" />
            </div>
          </div>
        </div>
      );
    case 'similar':
      return (
        <div className="mt-6">
          <SkeletonPulse className="h-3 w-24 mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-28">
                <SkeletonPulse className="aspect-square rounded-xl mb-2" />
                <SkeletonPulse className="h-3 w-20 mb-1" />
                <SkeletonPulse className="h-2.5 w-14" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="mt-6">
          <SkeletonPulse className="aspect-[2/1] rounded-xl" />
        </div>
      );
    default:
      return (
        <div className="mt-6 space-y-2">
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-4 w-full" />
        </div>
      );
  }
};

type SourceContext = 'trip' | 'explore' | 'search' | 'similar' | 'general';

interface DestinationContentProps {
  destination: Destination;
  related?: Destination[];
  whyThis?: string;
  tripContext?: {
    day?: number;
    fit?: string;
  };
  /** Where the drawer was opened from - affects action priority */
  source?: SourceContext;
  onOpenRelated: (destination: Destination) => void;
  onShowSimilar: () => void;
  onShowWhyThis: () => void;
}

interface EnrichedData {
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { weekday_text?: string[] };
  utc_offset?: number | null; // Minutes offset from UTC for local time display
  architect_obj?: { id: string; name: string; slug: string; image_url?: string };
  interior_designer_obj?: { id: string; name: string; slug: string };
  design_firm_obj?: { id: string; name: string; slug: string };
  movement_obj?: { id: string; name: string; slug: string };
  architectural_style?: string;
  description?: string;
  content?: string;
}

/**
 * DestinationContent - Smart destination view with category-adaptive layout
 */
const DestinationContent = memo(function DestinationContent({
  destination,
  related = [],
  tripContext,
  source = 'general',
  onOpenRelated,
  onShowSimilar,
}: DestinationContentProps) {
  const { user } = useAuth();
  const { activeTrip, addToTrip, startTrip } = useTripBuilder();

  // Smart category detection
  const categoryType = getCategoryType(destination.category);
  const sectionPriorities = SECTION_PRIORITIES[categoryType];

  // Source-aware: if from trip planner, trip actions are more important
  const isFromTrip = source === 'trip' || !!tripContext?.day;

  // State
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [isAddToTripExpanded, setIsAddToTripExpanded] = useState(false);
  const [addedToTripName, setAddedToTripName] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [parentDestination, setParentDestination] = useState<Destination | null>(null);
  const [nestedDestinations, setNestedDestinations] = useState<Destination[]>([]);
  const [similarPlaces, setSimilarPlaces] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Progressive reveal state
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // AI summary state
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userRelatedContext, setUserRelatedContext] = useState<string | null>(null);

  // Admin edit mode state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Auto-suggest parent based on address
  const [suggestedParent, setSuggestedParent] = useState<Destination | null>(null);
  const [editForm, setEditForm] = useState({
    name: destination.name || '',
    city: destination.city || '',
    country: destination.country || '',
    category: destination.category || '',
    micro_description: destination.micro_description || '',
    description: destination.description || '',
    image: destination.image || '',
    formatted_address: '',
    international_phone_number: '',
    website: destination.website || '',
    latitude: destination.latitude?.toString() || '',
    longitude: destination.longitude?.toString() || '',
    price_level: destination.price_level?.toString() || '',
    rating: destination.rating?.toString() || '',
    michelin_stars: destination.michelin_stars?.toString() || '',
    brand: destination.brand || '',
  });

  // Update form when destination or enrichedData changes
  useEffect(() => {
    setEditForm(prev => ({
      ...prev,
      name: destination.name || '',
      city: destination.city || '',
      country: destination.country || '',
      category: destination.category || '',
      micro_description: destination.micro_description || '',
      description: destination.description || '',
      image: destination.image || '',
      website: destination.website || '',
      latitude: destination.latitude?.toString() || '',
      longitude: destination.longitude?.toString() || '',
      price_level: destination.price_level?.toString() || '',
      rating: destination.rating?.toString() || '',
      michelin_stars: destination.michelin_stars?.toString() || '',
      brand: destination.brand || '',
    }));
  }, [destination]);

  // Sync enriched data to form when loaded
  useEffect(() => {
    if (enrichedData) {
      setEditForm(prev => ({
        ...prev,
        formatted_address: enrichedData.formatted_address || prev.formatted_address,
        international_phone_number: enrichedData.international_phone_number || prev.international_phone_number,
        website: enrichedData.website || prev.website,
        rating: enrichedData.rating?.toString() || prev.rating,
        price_level: enrichedData.price_level?.toString() || prev.price_level,
      }));
    }
  }, [enrichedData]);

  const imageUrl = destination.image || destination.image_thumbnail;

  // Load enriched data
  useEffect(() => {
    async function loadData() {
      if (!destination?.slug) return;
      setLoading(true);

      try {
        const supabase = createClient();

        // Fetch enriched destination data with relations
        // Include id and parent_destination_id for nested/parent loading
        const { data } = await supabase
          .from('destinations')
          .select(`
            id,
            parent_destination_id,
            formatted_address,
            international_phone_number,
            website,
            rating,
            user_ratings_total,
            price_level,
            opening_hours_json,
            utc_offset,
            architectural_style,
            description,
            content,
            architect:architects!architect_id(id, name, slug, image_url),
            design_firm:design_firms(id, name, slug),
            interior_designer:architects!interior_designer_id(id, name, slug),
            movement:design_movements(id, name, slug)
          `)
          .eq('slug', destination.slug)
          .single();

        if (data) {
          const enriched: EnrichedData = {
            formatted_address: data.formatted_address,
            international_phone_number: data.international_phone_number,
            website: data.website,
            rating: data.rating,
            user_ratings_total: data.user_ratings_total,
            price_level: data.price_level,
            utc_offset: data.utc_offset,
            architectural_style: data.architectural_style,
            description: data.description || undefined,
            content: data.content || undefined,
          };

          // Parse opening hours
          if (data.opening_hours_json) {
            try {
              enriched.opening_hours = typeof data.opening_hours_json === 'string'
                ? JSON.parse(data.opening_hours_json)
                : data.opening_hours_json;
            } catch {}
          }

          // Extract architect objects
          const d = data as any;
          if (d.architect) {
            const obj = Array.isArray(d.architect) ? d.architect[0] : d.architect;
            if (obj?.name) enriched.architect_obj = obj;
          }
          if (d.interior_designer) {
            const obj = Array.isArray(d.interior_designer) ? d.interior_designer[0] : d.interior_designer;
            if (obj?.name) enriched.interior_designer_obj = obj;
          }
          if (d.design_firm?.name) enriched.design_firm_obj = d.design_firm;
          if (d.movement) {
            const obj = Array.isArray(d.movement) ? d.movement[0] : d.movement;
            if (obj?.name) enriched.movement_obj = obj;
          }

          setEnrichedData(enriched);
        }

        // Load saved/visited status
        if (user) {
          const [savedRes, visitedRes] = await Promise.all([
            supabase.from('saved_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
            supabase.from('visited_places').select('id').eq('user_id', user.id).eq('destination_slug', destination.slug).maybeSingle(),
          ]);
          setIsSaved(!!savedRes.data);
          setIsVisited(!!visitedRes.data);
        }

        // Use fetched data for parent/nested loading (more reliable than prop data)
        const destinationId = data?.id || destination.id;
        const parentId = data?.parent_destination_id || destination.parent_destination_id;

        // Load parent destination (where this destination is nested inside)
        if (parentId) {
          const { data: parent } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('id', parentId)
            .single();
          if (parent) setParentDestination(parent as Destination);
        }

        // Load nested destinations (venues inside this destination)
        if (destinationId) {
          const { data: nested } = await supabase
            .from('destinations')
            .select('id, slug, name, category, image, image_thumbnail')
            .eq('parent_destination_id', destinationId)
            .limit(10);
          if (nested) setNestedDestinations(nested as Destination[]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [destination?.slug, user]);

  // Fetch similar places
  useEffect(() => {
    if (destination.slug) {
      fetch(`/api/intelligence/similar?slug=${destination.slug}&limit=4&filter=all`)
        .then(res => res.ok ? res.json() : { similar: [] })
        .then(data => setSimilarPlaces(data.similar || []))
        .catch(() => setSimilarPlaces([]));
    }
  }, [destination.slug]);

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = (session.user.app_metadata as Record<string, unknown> | null)?.role;
        setIsAdmin(role === 'admin');
      }
    }
    checkAdmin();
  }, [user]);

  // Reset edit mode when destination changes
  useEffect(() => {
    setIsEditMode(false);
  }, [destination.slug]);

  // Auto-detect and set parent based on address (no confirmation needed)
  useEffect(() => {
    async function autoSetParentFromAddress() {
      // Only if no parent is already set
      if (parentDestination) {
        setSuggestedParent(null);
        return;
      }

      // Need address info to detect
      const addressText = enrichedData?.formatted_address || '';
      if (!addressText || !destination.city || !destination.slug) {
        setSuggestedParent(null);
        return;
      }

      try {
        const supabase = createClient();

        // Find potential parent destinations in the same city
        // Look for hotels, buildings, and large venues that might contain other places
        const { data: potentialParents } = await supabase
          .from('destinations')
          .select('id, slug, name, category, image, image_thumbnail')
          .eq('city', destination.city)
          .neq('slug', destination.slug)
          .in('category', ['hotel', 'building', 'landmark', 'shopping mall', 'department store', 'station'])
          .limit(100);

        if (!potentialParents || potentialParents.length === 0) {
          setSuggestedParent(null);
          return;
        }

        // Check if any potential parent's name appears in the address
        const addressLower = addressText.toLowerCase();
        let detectedParent: Destination | null = null;

        for (const parent of potentialParents) {
          const parentNameLower = parent.name.toLowerCase();
          // Match if address contains the parent name (at least 4 chars to avoid false positives)
          if (parentNameLower.length >= 4 && addressLower.includes(parentNameLower)) {
            detectedParent = parent as Destination;
            break;
          }
          // Also try without common suffixes
          const nameWithoutSuffix = parentNameLower
            .replace(/\s*(hotel|tokyo|kyoto|osaka|london|paris|new york)$/i, '')
            .trim();
          if (nameWithoutSuffix.length >= 4 && addressLower.includes(nameWithoutSuffix)) {
            detectedParent = parent as Destination;
            break;
          }
        }

        if (detectedParent) {
          // Auto-set the parent - no confirmation needed when name is in address
          console.log(`[AutoParent] Setting ${destination.name} parent to ${detectedParent.name} (detected from address)`);

          const { error } = await supabase
            .from('destinations')
            .update({ parent_destination_id: detectedParent.id })
            .eq('slug', destination.slug);

          if (!error) {
            setParentDestination(detectedParent);
          } else {
            console.error('Error auto-setting parent:', error);
          }
        }

        setSuggestedParent(null);
      } catch (error) {
        console.error('Error detecting parent from address:', error);
        setSuggestedParent(null);
      }
    }

    autoSetParentFromAddress();
  }, [enrichedData?.formatted_address, destination.city, destination.slug, destination.name, parentDestination]);

  // Progressive reveal effect - stagger sections for smooth appearance
  useEffect(() => {
    // Reset on destination change
    setVisibleSections(new Set());
    setShowFullDescription(false);

    // Start progressive reveal after initial load
    const revealSections = ['description', 'hours', 'architecture', 'parent', 'nested', 'trip', 'map', 'similar', 'related'];
    const timers: NodeJS.Timeout[] = [];

    revealSections.forEach((section, index) => {
      const timer = setTimeout(() => {
        setVisibleSections((prev) => new Set([...prev, section]));
      }, 100 + index * 80); // Stagger by 80ms
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [destination.slug]);

  // Load user-related context (e.g., "Same architect designed 3 places you've visited")
  useEffect(() => {
    async function loadUserContext() {
      if (!user || !destination?.slug) return;

      const supabase = createClient();

      // Check if user has visited places by the same architect
      if (enrichedData?.architect_obj?.id) {
        const { data: visitedByArchitect } = await supabase
          .from('visited_places')
          .select('destination_slug, destinations!inner(name, architect_id)')
          .eq('user_id', user.id)
          .eq('destinations.architect_id', enrichedData.architect_obj.id)
          .limit(5);

        if (visitedByArchitect && visitedByArchitect.length > 0) {
          const count = visitedByArchitect.length;
          const architectName = enrichedData.architect_obj.name;
          if (count >= 3) {
            setUserRelatedContext(`You've visited ${count} other ${architectName} designs`);
          } else if (count >= 1) {
            setUserRelatedContext(`${architectName} also designed places you've been`);
          }
          return;
        }
      }

      // Check if user has visited places in the same city
      if (destination.city) {
        const { data: visitedInCity, count } = await supabase
          .from('visited_places')
          .select('destination_slug', { count: 'exact' })
          .eq('user_id', user.id)
          .not('destination_slug', 'eq', destination.slug)
          .limit(1);

        // This is a simplified check - would need a join for city filter
        // For now, just show generic context
      }
    }

    loadUserContext();
  }, [user, destination?.slug, enrichedData?.architect_obj]);

  // Parse opening hours with smart analysis - use destination's local time
  const openingHours = enrichedData?.opening_hours?.weekday_text || [];
  const todayHours = getTodayHours(openingHours, enrichedData?.utc_offset, destination.city);
  const hoursAnalysis = analyzeHours(openingHours, enrichedData?.utc_offset, destination.city);
  const isOpenNow = hoursAnalysis.isOpen;
  const bestTimeHint = getBestTimeHint(categoryType, openingHours, enrichedData?.utc_offset, destination.city);

  // Has architecture info
  const hasArchInfo = enrichedData?.architect_obj || enrichedData?.interior_designer_obj ||
                      enrichedData?.architectural_style || destination.architect;

  // Admin edit handler
  const handleSaveEdit = useCallback(async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const updateData: Record<string, unknown> = {
        name: editForm.name,
        city: editForm.city,
        country: editForm.country || null,
        category: editForm.category,
        micro_description: editForm.micro_description,
        description: editForm.description,
        image: editForm.image || null,
        formatted_address: editForm.formatted_address || null,
        international_phone_number: editForm.international_phone_number || null,
        website: editForm.website || null,
        brand: editForm.brand || null,
      };

      // Parse numeric fields
      if (editForm.latitude) updateData.latitude = parseFloat(editForm.latitude);
      if (editForm.longitude) updateData.longitude = parseFloat(editForm.longitude);
      if (editForm.price_level) updateData.price_level = parseInt(editForm.price_level);
      if (editForm.rating) updateData.rating = parseFloat(editForm.rating);
      if (editForm.michelin_stars) updateData.michelin_stars = parseInt(editForm.michelin_stars);

      const { error } = await supabase
        .from('destinations')
        .update(updateData)
        .eq('slug', destination.slug);

      if (error) throw error;
      setIsEditMode(false);
      // Reload to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, editForm, destination.slug]);

  // Handlers
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: destination.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [destination]);

  const handleDirections = useCallback(() => {
    // Use Apple Maps for directions
    const query = encodeURIComponent(`${destination.name} ${destination.city || ''}`);
    window.open(`https://maps.apple.com/?q=${query}`, '_blank');
  }, [destination]);

  const handleSave = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isSaved) {
      await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsSaved(false);
    } else {
      await supabase.from('saved_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsSaved(true);
    }
  }, [user, destination.slug, isSaved]);

  const handleVisit = useCallback(async () => {
    if (!user || !destination.slug) return;
    const supabase = createClient();

    if (isVisited) {
      await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', destination.slug);
      setIsVisited(false);
    } else {
      await supabase.from('visited_places').insert({ user_id: user.id, destination_slug: destination.slug });
      setIsVisited(true);
    }
  }, [user, destination.slug, isVisited]);

  const handleAddToTrip = useCallback((day?: number) => {
    setIsAddingToTrip(true);
    addToTrip(destination, day);
    setTimeout(() => setIsAddingToTrip(false), 1500);
  }, [addToTrip, destination]);

  // Use enriched rating if available
  const rating = enrichedData?.rating || destination.rating;
  const reviewCount = enrichedData?.user_ratings_total;

  // ============================================
  // SUBTLE INTELLIGENCE (automatic, no interaction)
  // ============================================

  const subtleContext = useMemo(() => getSubtleContext(
    categoryType,
    enrichedData?.price_level,
    rating ?? undefined,
    reviewCount ?? undefined,
    isOpenNow,
    enrichedData?.utc_offset,
    destination.city
  ), [categoryType, enrichedData?.price_level, rating, reviewCount, isOpenNow, enrichedData?.utc_offset, destination.city]);

  const subtleRecommendation = useMemo(() => getSubtleRecommendation(
    categoryType,
    destination,
    undefined, // Would come from user's visit history
    !!hasArchInfo
  ), [categoryType, destination, hasArchInfo]);

  // ============================================
  // SMART SECTION AVAILABILITY
  // ============================================

  // Determine which sections have data
  const hasDescription = !!(destination.micro_description || destination.description);
  const hasHours = !!(todayHours || enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website);
  const hasContact = !!(enrichedData?.formatted_address || enrichedData?.international_phone_number || enrichedData?.website);
  const hasMap = !!(destination.latitude && destination.longitude);
  const hasNested = nestedDestinations.length > 0;
  const hasParent = !!parentDestination;
  const hasSimilar = similarPlaces.length > 0;
  const hasRelated = related.length > 0;
  const hasTrip = true; // Always show trip section

  // Build available sections with their priorities
  type SectionKey = 'description' | 'hours' | 'contact' | 'architecture' | 'nested' | 'parent' | 'map' | 'trip' | 'similar' | 'related';

  const availableSections: { key: SectionKey; priority: number }[] = [];

  if (hasDescription) availableSections.push({ key: 'description', priority: sectionPriorities.description });
  if (hasHours) availableSections.push({ key: 'hours', priority: sectionPriorities.hours });
  if (hasArchInfo) availableSections.push({ key: 'architecture', priority: sectionPriorities.architecture });
  if (hasNested) availableSections.push({ key: 'nested', priority: sectionPriorities.nested });
  if (hasParent) availableSections.push({ key: 'parent', priority: sectionPriorities.parent });
  if (hasMap) availableSections.push({ key: 'map', priority: sectionPriorities.map });
  if (hasTrip) availableSections.push({ key: 'trip', priority: isFromTrip ? 0 : sectionPriorities.trip }); // Boost if from trip
  if (hasSimilar) availableSections.push({ key: 'similar', priority: sectionPriorities.similar });
  if (hasRelated) availableSections.push({ key: 'related', priority: sectionPriorities.related });

  // Sort by priority (lower = higher priority)
  const sortedSections = availableSections.sort((a, b) => a.priority - b.priority);

  // ============================================
  // SECTION RENDER FUNCTIONS
  // ============================================

  const renderSection = (key: SectionKey): React.ReactNode => {
    switch (key) {
      case 'description':
        // Use enriched description if available (lazy loaded), fallback to props
        const description = destination.micro_description || enrichedData?.description || destination.description || '';
        const isLong = description.length > 300;
        const displayText = isLong && !showFullDescription
          ? description.slice(0, 280) + '...'
          : description;

        return (
          <div key="description" className="mt-6">
            {/* User-related context badge */}
            {userRelatedContext && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#f9ede8] dark:bg-[#662e26]/20 border border-[#f2d9cf] dark:border-[#973f30]/30">
                <p className="text-xs text-[#c4604b] dark:text-[#d99c82] font-medium">
                  {userRelatedContext}
                </p>
              </div>
            )}

            <p className="text-sm text-[#5a5955] dark:text-[#c8c7c4] leading-relaxed">
              {displayText}
            </p>
            {isLong && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-3 text-sm font-medium text-[#c4604b] hover:text-[#b54d3a] transition-colors"
              >
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        );

      case 'parent':
        // Parent is auto-set from address, just show if exists
        if (!parentDestination) return null;
        return (
          <button
            key="parent"
            onClick={() => onOpenRelated(parentDestination)}
            className="w-full flex items-center gap-4 py-6 border-t border-b border-[var(--editorial-border)] text-left group"
          >
            <div className="w-12 h-12 overflow-hidden bg-[var(--editorial-border)] flex-shrink-0">
              {parentDestination.image ? (
                <Image src={parentDestination.image} alt="" width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-[var(--editorial-text-tertiary)]" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)]">Located inside</p>
              <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-accent)] transition-colors">{parentDestination.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-accent)] transition-colors" />
          </button>
        );

      case 'nested':
        return (
          <div key="nested" className="py-8 border-b border-[var(--editorial-border)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-4">Venues Inside</p>
            <div className="space-y-2">
              {nestedDestinations.map((nested) => (
                <button
                  key={nested.slug}
                  onClick={() => onOpenRelated(nested)}
                  className="w-full flex items-center gap-4 py-3 text-left group"
                >
                  <div className="w-11 h-11 overflow-hidden bg-[var(--editorial-border)] flex-shrink-0">
                    {nested.image ? (
                      <Image src={nested.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-[var(--editorial-text-tertiary)]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-accent)] transition-colors">{nested.name}</p>
                    <p className="text-xs text-[var(--editorial-text-tertiary)]">{nested.category && capitalizeCategory(nested.category)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-accent)] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        );

      case 'hours':
        const localTimeStr = getLocalTimeAtDestination(enrichedData?.utc_offset, destination.city);
        return (
          <div key="hours" className="py-8 border-b border-[var(--editorial-border)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-5">
              Hours & Contact
            </p>
            <div className="space-y-5">
              {todayHours && (
                <div className="flex items-start gap-4">
                  <Clock className="h-4 w-4 text-[var(--editorial-accent)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-[var(--editorial-text-primary)]">{todayHours}</span>
                    {hoursAnalysis.timeUntilChange && (
                      <span className={`ml-2 text-xs font-medium ${
                        hoursAnalysis.category === 'closing-soon' ? 'text-amber-600' :
                        hoursAnalysis.category === 'opening-soon' ? 'text-[var(--editorial-accent)]' : ''
                      }`}>
                        {hoursAnalysis.status}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {enrichedData?.formatted_address && (
                <button onClick={handleDirections} className="flex items-start gap-4 text-left group">
                  <MapPin className="h-4 w-4 text-[var(--editorial-accent)] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors">{enrichedData.formatted_address}</span>
                </button>
              )}
              {enrichedData?.international_phone_number && (
                <a href={`tel:${enrichedData.international_phone_number}`} className="flex items-center gap-4 group">
                  <Phone className="h-4 w-4 text-[var(--editorial-accent)] flex-shrink-0" />
                  <span className="text-sm text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors">{enrichedData.international_phone_number}</span>
                </a>
              )}
              {enrichedData?.website && (
                <a href={enrichedData.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                  <Globe className="h-4 w-4 text-[var(--editorial-accent)] flex-shrink-0" />
                  <span className="text-sm text-[var(--editorial-accent)] group-hover:underline truncate">
                    {(() => { try { return new URL(enrichedData.website).hostname.replace('www.', ''); } catch { return enrichedData.website; } })()}
                  </span>
                </a>
              )}
            </div>
          </div>
        );

      case 'architecture':
        return (
          <div key="architecture" className="py-8 border-b border-[var(--editorial-border)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-5">Design</p>
            <div className="space-y-2">
              {enrichedData?.architect_obj && (
                <Link href={`/architect/${enrichedData.architect_obj.slug}`} className="flex items-center gap-4 py-3 group">
                  <div className="w-11 h-11 rounded-full bg-[var(--editorial-border)] flex items-center justify-center overflow-hidden">
                    {enrichedData.architect_obj.image_url ? (
                      <Image src={enrichedData.architect_obj.image_url} alt="" width={44} height={44} className="object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-[var(--editorial-text-secondary)]">{enrichedData.architect_obj.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--editorial-text-tertiary)]">Architect</p>
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] truncate transition-colors">
                      {enrichedData.architect_obj.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-accent)] transition-colors" />
                </Link>
              )}
              {!enrichedData?.architect_obj && destination.architect && (
                <div className="flex items-center gap-4 py-3">
                  <div className="w-11 h-11 rounded-full bg-[var(--editorial-border)] flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-[var(--editorial-text-secondary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--editorial-text-tertiary)]">Architect</p>
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">{destination.architect}</p>
                  </div>
                </div>
              )}
              {enrichedData?.interior_designer_obj && (
                <Link href={`/architect/${enrichedData.interior_designer_obj.slug}`} className="flex items-center gap-4 py-3 group">
                  <div className="w-11 h-11 rounded-full bg-[var(--editorial-border)] flex items-center justify-center">
                    <span className="text-sm font-medium text-[var(--editorial-text-secondary)]">{enrichedData.interior_designer_obj.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--editorial-text-tertiary)]">Interior Designer</p>
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] truncate transition-colors">
                      {enrichedData.interior_designer_obj.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-accent)] transition-colors" />
                </Link>
              )}
              {enrichedData?.architectural_style && (
                <div className="flex items-center gap-4 py-3">
                  <div className="w-11 h-11 rounded-full bg-[var(--editorial-border)] flex items-center justify-center">
                    <span className="text-xs font-medium text-[var(--editorial-text-secondary)]">S</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.1em] text-[var(--editorial-text-tertiary)]">Style</p>
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate">{enrichedData.architectural_style}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'map':
        return (
          <div key="map" className="py-8">
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(destination.name + ' ' + (destination.city || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative aspect-[2/1] overflow-hidden bg-[var(--editorial-border)]"
            >
              <GoogleStaticMap
                center={{ lat: destination.latitude!, lng: destination.longitude! }}
                zoom={15}
                height="100%"
                className="w-full h-full"
              />
              <div className="absolute inset-0 flex items-center justify-center hover:bg-black/10 transition-colors">
                <span className="px-4 py-2 bg-[var(--editorial-bg)]/95 text-xs font-medium tracking-[0.02em] text-[var(--editorial-text-primary)] border border-[var(--editorial-text-primary)]">
                  Open in Maps
                </span>
              </div>
            </a>
          </div>
        );

      case 'trip':
        // Show "Start Trip" button if no active trip
        if (!activeTrip) {
          return (
            <div key="trip" className="py-8 border-b border-[var(--editorial-border)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-4">
                Add to Trip
              </p>
              <button
                onClick={() => {
                  startTrip(destination.city || 'New Trip', 3);
                  handleAddToTrip(1);
                }}
                disabled={isAddingToTrip}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border border-[var(--editorial-text-primary)] text-[var(--editorial-text-primary)] text-sm font-medium tracking-[0.02em] transition-all hover:bg-[var(--editorial-text-primary)] hover:text-[var(--editorial-bg)] active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Start {destination.city ? `${destination.city} Trip` : 'New Trip'}
              </button>
            </div>
          );
        }

        return (
          <div key="trip" className="py-8 border-b border-[var(--editorial-border)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)]">
                {isFromTrip ? 'Add to Trip' : `Add to ${activeTrip.title}`}
              </p>
              {tripContext?.fit && (
                <span className="text-xs text-[#4A7C59] font-medium">{tripContext.fit}</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeTrip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => handleAddToTrip(day.dayNumber)}
                  disabled={isAddingToTrip}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    tripContext?.day === day.dayNumber
                      ? 'border border-[var(--editorial-text-primary)] bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                      : 'border border-[var(--editorial-border)] text-[var(--editorial-text-secondary)] hover:border-[var(--editorial-text-secondary)]'
                  }`}
                >
                  {isAddingToTrip ? <Loader2 className="h-4 w-4 animate-spin" /> : `Day ${day.dayNumber}`}
                </button>
              ))}
              <button
                onClick={() => handleAddToTrip()}
                disabled={isAddingToTrip}
                className="px-4 py-2.5 rounded-lg border border-dashed border-[var(--editorial-text-tertiary)] text-sm font-medium text-[var(--editorial-text-secondary)] hover:border-[var(--editorial-text-secondary)] transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                New Day
              </button>
            </div>
          </div>
        );

      case 'similar':
        return (
          <div key="similar" className="py-8 border-b border-[var(--editorial-border)]">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)]">Similar</p>
              <button onClick={onShowSimilar} className="text-xs font-medium text-[var(--editorial-accent)] hover:underline transition-colors">
                View all
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-8 px-8 scrollbar-hide">
              {similarPlaces.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="flex-shrink-0 w-[120px] text-left group"
                >
                  <div className="relative aspect-square overflow-hidden bg-[var(--editorial-border)] mb-3">
                    {(dest.image || dest.image_thumbnail) && (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-accent)] transition-colors">{dest.name}</p>
                  <p className="text-xs text-[var(--editorial-text-tertiary)] truncate">{capitalizeCategory(dest.category || '')}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'related':
        return (
          <div key="related" className="py-8 border-b border-[var(--editorial-border)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-5">
              More in {capitalizeCity(destination.city || '')}
            </p>
            <div className="space-y-3">
              {related.slice(0, 4).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => onOpenRelated(dest)}
                  className="w-full flex items-center gap-4 py-2 text-left group"
                >
                  <div className="w-14 h-14 overflow-hidden bg-[var(--editorial-border)] flex-shrink-0">
                    {dest.image ? (
                      <Image src={dest.image} alt="" width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-[var(--editorial-accent)]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--editorial-text-primary)] truncate group-hover:text-[var(--editorial-accent)] transition-colors">{dest.name}</p>
                    <p className="text-xs text-[var(--editorial-text-tertiary)]">{capitalizeCategory(dest.category || '')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--editorial-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render edit form when in edit mode
  if (isEditMode && isAdmin) {
    const inputClass = "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white";
    const labelClass = "block text-xs font-medium text-gray-500 mb-1.5";

    return (
      <div className="pb-8 px-5 pt-5 max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Edit Destination</h2>
          <span className="text-xs text-gray-400">{destination.slug}</span>
        </div>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-gray-400">Basic Info</p>
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City *</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value={editForm.country} onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category *</label>
                <input type="text" value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input type="text" value={editForm.brand} onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))} className={inputClass} placeholder="e.g., Aman, Four Seasons" />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Descriptions</p>
            <div>
              <label className={labelClass}>Micro Description</label>
              <textarea value={editForm.micro_description} onChange={(e) => setEditForm(prev => ({ ...prev, micro_description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} placeholder="One-liner description" />
            </div>
            <div>
              <label className={labelClass}>Full Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={4} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Contact & Location</p>
            <div>
              <label className={labelClass}>Address</label>
              <input type="text" value={editForm.formatted_address} onChange={(e) => setEditForm(prev => ({ ...prev, formatted_address: e.target.value }))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Phone</label>
                <input type="text" value={editForm.international_phone_number} onChange={(e) => setEditForm(prev => ({ ...prev, international_phone_number: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input type="text" value={editForm.website} onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Latitude</label>
                <input type="text" value={editForm.latitude} onChange={(e) => setEditForm(prev => ({ ...prev, latitude: e.target.value }))} className={inputClass} placeholder="e.g., 35.6762" />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input type="text" value={editForm.longitude} onChange={(e) => setEditForm(prev => ({ ...prev, longitude: e.target.value }))} className={inputClass} placeholder="e.g., 139.6503" />
              </div>
            </div>
          </div>

          {/* Ratings & Status */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Ratings & Status</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Rating</label>
                <input type="text" value={editForm.rating} onChange={(e) => setEditForm(prev => ({ ...prev, rating: e.target.value }))} className={inputClass} placeholder="e.g., 4.5" />
              </div>
              <div>
                <label className={labelClass}>Price Level</label>
                <input type="text" value={editForm.price_level} onChange={(e) => setEditForm(prev => ({ ...prev, price_level: e.target.value }))} className={inputClass} placeholder="1-4" />
              </div>
              <div>
                <label className={labelClass}>Michelin Stars</label>
                <input type="text" value={editForm.michelin_stars} onChange={(e) => setEditForm(prev => ({ ...prev, michelin_stars: e.target.value }))} className={inputClass} placeholder="0-3" />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Media</p>
            <div>
              <label className={labelClass}>Image URL</label>
              <input type="text" value={editForm.image} onChange={(e) => setEditForm(prev => ({ ...prev, image: e.target.value }))} className={inputClass} />
            </div>
            {editForm.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image src={editForm.image} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          {/* Parent/Nested Info */}
          {(parentDestination || nestedDestinations.length > 0) && (
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
              <p className="text-xs uppercase tracking-wider text-gray-400">Location Nesting</p>
              {parentDestination && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400">Located inside:</span> {parentDestination.name}
                </div>
              )}
              {nestedDestinations.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400">Contains:</span> {nestedDestinations.map(n => n.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 sticky bottom-0 bg-white dark:bg-gray-950 pb-2">
            <button
              onClick={() => setIsEditMode(false)}
              className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tab state for organized information
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'map'>('overview');

  // Get hours information
  const hours = enrichedData?.opening_hours?.weekday_text;

  return (
    <div className="bg-[var(--editorial-bg)]">
      {/* Single Square Image - 1:1 aspect ratio */}
      <div className="px-6 sm:px-8 pt-14 pb-0">
        <div className="relative w-full bg-[var(--editorial-border)] rounded-lg overflow-hidden" style={{ aspectRatio: '1/1' }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={destination.name} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-[var(--editorial-text-tertiary)]" />
            </div>
          )}
          {/* Hours Status Badge */}
          {hoursAnalysis.status && (
            <div className="absolute bottom-3 left-3">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                hoursAnalysis.category === 'open' ? 'bg-green-600 text-white' :
                hoursAnalysis.category === 'opening-soon' ? 'bg-blue-600 text-white' :
                hoursAnalysis.category === 'closing-soon' ? 'bg-amber-500 text-white' :
                'bg-gray-800 text-white'
              }`}>
                {hoursAnalysis.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 sm:px-8 pt-6 pb-10">
        {/* Category Label - Small caps */}
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-3">
          {destination.category && capitalizeCategory(destination.category)}
          {destination.city && ` · ${capitalizeCity(destination.city)}`}
        </p>

        {/* Title - Serif, editorial */}
        <h1 className="font-editorial-serif text-[26px] sm:text-[32px] font-medium tracking-[-0.02em] leading-[1.15] text-[var(--editorial-text-primary)] mb-2">
          {destination.name}
        </h1>

        {/* Brand Link */}
        {destination.brand && (
          <Link
            href={`/brand/${encodeURIComponent(destination.brand)}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] transition-colors mb-3"
          >
            <Building2 className="h-3 w-3" />
            {destination.brand}
          </Link>
        )}

        {/* Rating & Meta Row */}
        <div className="flex items-center gap-3 text-sm text-[var(--editorial-text-secondary)] mb-5 flex-wrap">
          {rating && (
            <span className="flex items-center gap-1.5">
              <img src="/google-logo.svg" alt="Google" className="h-3.5 w-3.5" />
              <span className="font-medium text-[var(--editorial-text-primary)]">{rating.toFixed(1)}</span>
              {reviewCount && <span className="text-[var(--editorial-text-tertiary)]">({reviewCount.toLocaleString()})</span>}
            </span>
          )}
          {enrichedData?.price_level && (
            <span className="text-[var(--editorial-text-tertiary)]">{'$'.repeat(enrichedData.price_level)}</span>
          )}
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="flex items-center gap-1">
              <img src="/michelin-star.svg" alt="Michelin" className="w-3.5 h-3.5" />
              {destination.michelin_stars} Star{destination.michelin_stars > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Add to Trip - Inline expandable */}
        <div className="mb-4">
          <InlineAddToTrip
            destinationSlug={destination.slug}
            destinationName={destination.name}
            isExpanded={isAddToTripExpanded}
            onExpandedChange={setIsAddToTripExpanded}
            onSuccess={(tripTitle, day) => {
              setAddedToTripName(tripTitle);
              toast.success(`Added to ${tripTitle}${day ? ` (Day ${day})` : ''}`);
            }}
            onError={(message) => toast.error(message)}
            isAddedToTrip={!!addedToTripName}
          />
        </div>

        {/* Secondary Action Buttons */}
        <div className="flex gap-2 mb-6">
          {/* Save Button */}
          <button
            onClick={user ? handleSave : undefined}
            className={`h-10 w-10 flex items-center justify-center rounded-lg border transition-all ${
              isSaved
                ? 'border-[var(--editorial-text-primary)] bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                : 'border-[var(--editorial-border)] text-[var(--editorial-text-tertiary)] hover:border-[var(--editorial-text-primary)] hover:text-[var(--editorial-text-primary)]'
            }`}
            title={isSaved ? 'Saved' : 'Save'}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-[var(--editorial-border)] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:border-[var(--editorial-text-primary)] transition-all"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDirections}
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-[var(--editorial-border)] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:border-[var(--editorial-text-primary)] transition-all"
            title="Directions"
          >
            <Navigation className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`h-10 w-10 flex items-center justify-center rounded-lg border transition-all ${
                isEditMode
                  ? 'border-[var(--editorial-text-primary)] bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                  : 'border-[var(--editorial-border)] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:border-[var(--editorial-text-primary)]'
              }`}
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Been Here Button */}
        {user && (
          <button
            onClick={handleVisit}
            className={`w-full h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg border transition-all mb-6 ${
              isVisited
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-[var(--editorial-border)] text-[var(--editorial-text-secondary)] hover:border-[var(--editorial-text-primary)] hover:text-[var(--editorial-text-primary)]'
            }`}
          >
            <Check className="h-4 w-4" />
            {isVisited ? 'Visited' : 'Been Here'}
          </button>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-[var(--editorial-border)] mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-[var(--editorial-text-primary)] border-b-2 border-[var(--editorial-text-primary)]'
                : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-[var(--editorial-text-primary)] border-b-2 border-[var(--editorial-text-primary)]'
                : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
            }`}
          >
            Info
          </button>
          {destination.latitude && destination.longitude && (
            <button
              onClick={() => setActiveTab('map')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'text-[var(--editorial-text-primary)] border-b-2 border-[var(--editorial-text-primary)]'
                  : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
              }`}
            >
              Map
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Description */}
            {(destination.micro_description || enrichedData?.description || destination.description) && (
              <p
                className="text-sm leading-[1.75] text-[var(--editorial-text-secondary)] mb-6"
                style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
              >
                {destination.micro_description || enrichedData?.description || destination.description}
              </p>
            )}

            {/* Architecture / Design Info */}
            {(enrichedData?.architect_obj || enrichedData?.interior_designer_obj || enrichedData?.design_firm_obj || enrichedData?.architectural_style) && (
              <div className="mb-6 pt-4 border-t border-[var(--editorial-border)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-3">Design</p>
                {enrichedData?.architect_obj && (
                  <Link
                    href={`/architect/${enrichedData.architect_obj.slug}`}
                    className="flex items-center gap-3 py-2 group"
                  >
                    {enrichedData.architect_obj.image_url ? (
                      <Image src={enrichedData.architect_obj.image_url} alt={enrichedData.architect_obj.name} width={40} height={40} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--editorial-border)] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[var(--editorial-text-tertiary)]">Architect</p>
                      <p className="text-sm text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors">{enrichedData.architect_obj.name}</p>
                    </div>
                  </Link>
                )}
                {enrichedData?.architectural_style && (
                  <p className="text-sm text-[var(--editorial-text-secondary)] mt-2">{enrichedData.architectural_style}</p>
                )}
              </div>
            )}

            {/* Similar Places */}
            {similarPlaces.length > 0 && (
              <div className="mb-6 pt-4 border-t border-[var(--editorial-border)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)]">Similar Places</p>
                  <button onClick={onShowSimilar} className="text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] transition-colors">
                    See all
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 sm:-mx-8 sm:px-8">
                  {similarPlaces.slice(0, 4).map((place) => (
                    <button
                      key={place.id}
                      onClick={() => onOpenRelated(place)}
                      className="flex-shrink-0 w-24 text-left group"
                    >
                      <div className="relative aspect-square mb-2 rounded-lg overflow-hidden bg-[var(--editorial-border)]">
                        {place.image && (
                          <Image src={place.image} alt={place.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--editorial-text-primary)] line-clamp-1">{place.name}</p>
                      <p className="text-xs text-[var(--editorial-text-tertiary)]">{place.city && capitalizeCity(place.city)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nested Destinations (venues inside hotels, etc) */}
            {nestedDestinations.length > 0 && (
              <div className="mb-6 pt-4 border-t border-[var(--editorial-border)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-3">Inside {destination.name}</p>
                <div className="space-y-2">
                  {nestedDestinations.map((nested) => (
                    <button
                      key={nested.id}
                      onClick={() => onOpenRelated(nested)}
                      className="w-full flex items-center gap-3 py-2 text-left group"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--editorial-border)] flex-shrink-0">
                        {nested.image && <Image src={nested.image} alt={nested.name} fill className="object-cover" />}
                      </div>
                      <div>
                        <p className="text-sm text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors">{nested.name}</p>
                        <p className="text-xs text-[var(--editorial-text-tertiary)]">{nested.category && capitalizeCategory(nested.category)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Parent Destination */}
            {parentDestination && (
              <div className="mb-6 pt-4 border-t border-[var(--editorial-border)]">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-3">Located Inside</p>
                <button
                  onClick={() => onOpenRelated(parentDestination)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--editorial-border)] flex-shrink-0">
                    {parentDestination.image && <Image src={parentDestination.image} alt={parentDestination.name} fill className="object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm text-[var(--editorial-text-primary)] group-hover:text-[var(--editorial-accent)] transition-colors">{parentDestination.name}</p>
                    <p className="text-xs text-[var(--editorial-text-tertiary)]">{parentDestination.category && capitalizeCategory(parentDestination.category)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] ml-auto" />
                </button>
              </div>
            )}

            {/* Website URL */}
            {enrichedData?.website && (
              <a
                href={enrichedData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] transition-colors"
              >
                <Globe className="w-4 h-4" />
                {(() => { try { return new URL(enrichedData.website).hostname.replace('www.', ''); } catch { return enrichedData.website; } })()}
              </a>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-5">
            {/* Hours */}
            {hours && hours.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-2">Hours</p>
                <div className="space-y-1">
                  {hours.map((h, i) => (
                    <p key={i} className="text-sm text-[var(--editorial-text-secondary)]">{h}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            {enrichedData?.formatted_address && (
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-2">Address</p>
                <p className="text-sm text-[var(--editorial-text-secondary)]">{enrichedData.formatted_address}</p>
              </div>
            )}

            {/* Phone */}
            {enrichedData?.international_phone_number && (
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-2">Phone</p>
                <a
                  href={`tel:${enrichedData.international_phone_number}`}
                  className="text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-accent)] transition-colors"
                >
                  {enrichedData.international_phone_number}
                </a>
              </div>
            )}

            {/* Website */}
            {enrichedData?.website && (
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--editorial-text-tertiary)] mb-2">Website</p>
                <a
                  href={enrichedData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-accent)] transition-colors"
                >
                  {(() => { try { return new URL(enrichedData.website).hostname.replace('www.', ''); } catch { return enrichedData.website; } })()}
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && destination.latitude && destination.longitude && (
          <div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden mb-4">
              <GoogleStaticMap
                center={{ lat: destination.latitude, lng: destination.longitude }}
                zoom={15}
                height={300}
                showPin
              />
            </div>
            {enrichedData?.formatted_address && (
              <p className="text-sm text-[var(--editorial-text-secondary)]">{enrichedData.formatted_address}</p>
            )}
          </div>
        )}

        {/* View Full Page Link */}
        <div className="mt-8 pt-6 border-t border-[var(--editorial-border)]">
          <Link
            href={`/destination/${destination.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--editorial-text-primary)] hover:text-[var(--editorial-accent)] transition-colors"
          >
            View full page
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
});

/**
 * Get today's hours string - uses destination's local time
 */
function getTodayHours(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): string | null {
  if (!hours || hours.length === 0) return null;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Use destination's local day, not user's
  const { dayOfWeek } = getDestinationLocalTime(utcOffsetMinutes, city);
  const today = dayNames[dayOfWeek];
  return hours.find(h => h.startsWith(today)) || null;
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  // Parse formats like "9:00 AM", "10:30 PM", "21:00"
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parse opening hours to get open/close times
 * Handles formats like:
 * - "Monday: 9:00 AM – 10:00 PM" (both have AM/PM)
 * - "Monday: 6:00 – 8:00 PM" (only closing has PM - opening should inherit PM)
 * - "Monday: 9:00 – 22:00" (24-hour format)
 */
function parseHoursRange(hoursStr: string): { open: number; close: number } | null {
  const timeMatch = hoursStr.match(/(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)\s*[–\-]\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)/i);
  if (!timeMatch) return null;

  let openStr = timeMatch[1].trim();
  const closeStr = timeMatch[2].trim();

  // Check if open time is missing AM/PM but close time has it
  const openHasPeriod = /AM|PM/i.test(openStr);
  const closeHasPeriod = /AM|PM/i.test(closeStr);

  if (!openHasPeriod && closeHasPeriod) {
    // Extract the period from close time
    const closePeriod = closeStr.match(/AM|PM/i)?.[0] || '';
    const openHour = parseInt(openStr.match(/\d{1,2}/)?.[0] || '0', 10);
    const closeHour = parseInt(closeStr.match(/\d{1,2}/)?.[0] || '0', 10);

    // If open hour > close hour (e.g., 10:00 – 2:00 AM), open is PM
    // If open hour <= close hour in same period, they share the same period
    // E.g., "6:00 – 8:00 PM" means 6 PM to 8 PM
    // But "10:00 AM – 6:00 PM" would have both periods explicit
    if (closePeriod.toUpperCase() === 'PM' && openHour <= closeHour) {
      // Same PM period: 6:00 – 8:00 PM means 6 PM – 8 PM
      openStr = openStr + ' ' + closePeriod;
    } else if (closePeriod.toUpperCase() === 'AM' && openHour > closeHour) {
      // Overnight: 10:00 – 2:00 AM means 10 PM – 2 AM
      openStr = openStr + ' PM';
    } else {
      // Default: assume same period
      openStr = openStr + ' ' + closePeriod;
    }
  }

  const open = parseTimeToMinutes(openStr);
  const close = parseTimeToMinutes(closeStr);

  if (open === null || close === null) return null;
  return { open, close: close < open ? close + 24 * 60 : close }; // Handle overnight hours
}

interface SmartHoursResult {
  isOpen: boolean | null;
  status: string;
  timeUntilChange: string | null;
  category: 'open' | 'closing-soon' | 'closed' | 'opening-soon' | 'unknown';
}

/**
 * Smart hours analysis - returns human-friendly status
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function analyzeHours(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): SmartHoursResult {
  const defaultResult: SmartHoursResult = {
    isOpen: null,
    status: '',
    timeUntilChange: null,
    category: 'unknown',
  };

  if (!hours || hours.length === 0) return defaultResult;

  const todayHours = getTodayHours(hours, utcOffsetMinutes, city);
  if (!todayHours) return defaultResult;

  // Check if closed today
  if (todayHours.toLowerCase().includes('closed')) {
    // Find next open day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const { dayOfWeek: todayIndex } = getDestinationLocalTime(utcOffsetMinutes, city);

    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDayHours = hours.find(h => h.startsWith(dayNames[nextDayIndex]));
      if (nextDayHours && !nextDayHours.toLowerCase().includes('closed')) {
        const dayName = i === 1 ? 'tomorrow' : dayNames[nextDayIndex];
        return {
          isOpen: false,
          status: `Closed · Opens ${dayName}`,
          timeUntilChange: null,
          category: 'closed',
        };
      }
    }
    return { isOpen: false, status: 'Closed today', timeUntilChange: null, category: 'closed' };
  }

  // Parse today's hours
  const range = parseHoursRange(todayHours);
  if (!range) return { ...defaultResult, isOpen: true, status: 'Open', category: 'open' };

  // Use destination's local time, not user's
  const { hour, dayOfWeek } = getDestinationLocalTime(utcOffsetMinutes, city);
  const now = new Date();
  // Get minutes from getDestinationLocalTime result
  let currentMinutes: number;

  // Try city timezone first
  if (city) {
    const cityKey = city.toLowerCase().replace(/\s+/g, '-');
    const cityTimezone = CITY_TIMEZONES[cityKey];
    if (cityTimezone) {
      try {
        const localString = now.toLocaleString('en-US', { timeZone: cityTimezone });
        const localTime = new Date(localString);
        currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
      } catch {
        currentMinutes = hour * 60 + now.getMinutes();
      }
    } else if (utcOffsetMinutes != null) {
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
      currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
    } else {
      // Fallback to UTC
      const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
      const utcTime = new Date(utcString);
      currentMinutes = utcTime.getHours() * 60 + utcTime.getMinutes();
    }
  } else if (utcOffsetMinutes != null) {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (utcOffsetMinutes * 60000));
    currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
  } else {
    // Fallback to UTC
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const utcTime = new Date(utcString);
    currentMinutes = utcTime.getHours() * 60 + utcTime.getMinutes();
  }

  // Check if currently open
  if (currentMinutes >= range.open && currentMinutes < range.close) {
    const minutesUntilClose = range.close - currentMinutes;

    // Closing soon (within 60 minutes)
    if (minutesUntilClose <= 60) {
      const timeStr = minutesUntilClose <= 30
        ? `${minutesUntilClose} min`
        : `${Math.round(minutesUntilClose / 60)} hr`;
      return {
        isOpen: true,
        status: `Closes in ${timeStr}`,
        timeUntilChange: timeStr,
        category: 'closing-soon',
      };
    }

    return { isOpen: true, status: 'Open now', timeUntilChange: null, category: 'open' };
  }

  // Currently closed - check when it opens
  if (currentMinutes < range.open) {
    const minutesUntilOpen = range.open - currentMinutes;

    // Opening soon (within 2 hours)
    if (minutesUntilOpen <= 120) {
      const hours = Math.floor(minutesUntilOpen / 60);
      const mins = minutesUntilOpen % 60;
      const timeStr = hours > 0
        ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`
        : `${mins} min`;
      return {
        isOpen: false,
        status: `Opens in ${timeStr.trim()}`,
        timeUntilChange: timeStr.trim(),
        category: 'opening-soon',
      };
    }

    // Opening later today
    const openTime = `${Math.floor(range.open / 60)}:${String(range.open % 60).padStart(2, '0')}`;
    const openHour = Math.floor(range.open / 60);
    const period = openHour >= 12 ? 'PM' : 'AM';
    const displayHour = openHour > 12 ? openHour - 12 : openHour === 0 ? 12 : openHour;
    return {
      isOpen: false,
      status: `Opens at ${displayHour}${range.open % 60 > 0 ? ':' + String(range.open % 60).padStart(2, '0') : ''} ${period}`,
      timeUntilChange: null,
      category: 'closed',
    };
  }

  // After closing - opens tomorrow
  return {
    isOpen: false,
    status: 'Closed · Opens tomorrow',
    timeUntilChange: null,
    category: 'closed',
  };
}

/**
 * Get best time hint based on category
 * Uses destination's local time based on city timezone or utcOffsetMinutes
 */
function getBestTimeHint(categoryType: CategoryType, hours: string[], utcOffsetMinutes?: number | null, city?: string | null): string | null {
  const hints: Record<CategoryType, string[]> = {
    dining: ['Best for dinner: 7-9 PM', 'Lunch crowds: 12-1:30 PM', 'Quietest: 3-5 PM'],
    nightlife: ['Peak hours: 10 PM - 1 AM', 'Happy hour vibes: 5-7 PM'],
    culture: ['Avoid crowds: weekday mornings', 'Best light: late afternoon'],
    hotel: [],
    shopping: ['Quietest: weekday mornings', 'Avoid: lunch hour rush'],
    outdoor: ['Best light: golden hour', 'Cooler temps: early morning'],
    architecture: ['Best for photos: golden hour', 'Less crowded: early morning'],
    general: [],
  };

  const categoryHints = hints[categoryType];
  if (!categoryHints.length) return null;

  // Return a contextual hint based on destination's local time
  const { hour } = getDestinationLocalTime(utcOffsetMinutes, city);

  if (categoryType === 'dining') {
    if (hour >= 10 && hour < 14) return 'Currently: lunch rush';
    if (hour >= 17 && hour < 21) return 'Currently: dinner peak';
    if (hour >= 14 && hour < 17) return 'Good time: quieter now';
  }

  if (categoryType === 'nightlife') {
    if (hour >= 17 && hour < 20) return 'Happy hour time';
    if (hour >= 22 || hour < 2) return 'Peak hours now';
  }

  if (categoryType === 'culture' || categoryType === 'architecture') {
    if (hour >= 9 && hour < 11) return 'Good time: morning quiet';
    if (hour >= 16 && hour < 18) return 'Beautiful afternoon light';
  }

  return categoryHints[0] || null;
}

/**
 * Check if currently open (simplified)
 */
function checkIfOpen(hours: string[], utcOffsetMinutes?: number | null, city?: string | null): boolean | null {
  if (!hours || hours.length === 0) return null;
  const todayHours = getTodayHours(hours, utcOffsetMinutes, city);
  if (!todayHours) return null;
  if (todayHours.includes('Closed')) return false;
  return true;
}

export default DestinationContent;
