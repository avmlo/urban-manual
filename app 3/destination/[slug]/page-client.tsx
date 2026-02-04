'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Bookmark, Check, Plus, ChevronDown, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { CARD_MEDIA, CARD_TITLE, CARD_WRAPPER } from '@/components/CardStyles';
import { trackEvent } from '@/lib/analytics/track';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';
import { VisitedModal } from '@/components/VisitedModal';
import { useAuth } from '@/contexts/AuthContext';
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { ForecastInfo } from '@/components/ForecastInfo';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { TopicsDisplay } from '@/components/TopicsDisplay';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { SequencePredictionsInline } from '@/components/SequencePredictionsInline';

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  michelin_stars?: number;
  crown?: boolean;
  rating?: number;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface DestinationPageClientProps {
  initialDestination: Destination;
  parentDestination?: Destination | null;
}

export default function DestinationPageClient({ initialDestination, parentDestination }: DestinationPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { trackAction, predictions } = useSequenceTracker();

  const [destination] = useState<Destination>(initialDestination);
  const [loading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);

  // Parse enriched JSON fields from initial destination
  const enrichedData = useState(() => {
    const enriched: any = { ...initialDestination };

    if (initialDestination.opening_hours_json) {
      try {
        enriched.opening_hours = typeof initialDestination.opening_hours_json === 'string'
          ? JSON.parse(initialDestination.opening_hours_json)
          : initialDestination.opening_hours_json;
      } catch (e) {
        console.error('Error parsing opening_hours_json:', e);
      }
    }

    if (initialDestination.reviews_json) {
      try {
        enriched.reviews = typeof initialDestination.reviews_json === 'string'
          ? JSON.parse(initialDestination.reviews_json)
          : initialDestination.reviews_json;
      } catch (e) {
        console.error('Error parsing reviews_json:', e);
      }
    }

    if (initialDestination.photos_json) {
      try {
        enriched.photos = typeof initialDestination.photos_json === 'string'
          ? JSON.parse(initialDestination.photos_json)
          : initialDestination.photos_json;
      } catch (e) {
        console.error('Error parsing photos_json:', e);
      }
    }

    return enriched;
  })[0];

  // Track destination view
  useEffect(() => {
    if (destination?.id && user?.id) {
      // Track view event to Discovery Engine for personalization
      fetch('/api/discovery/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventType: 'view',
          documentId: destination.slug,
        }),
      }).catch((error) => {
        console.warn('Failed to track view event:', error);
      });
    }
    
    if (destination?.id) {
      trackEvent({
        event_type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
        metadata: {
          category: destination.category,
          city: destination.city,
        },
      });

      // Track for sequence prediction
      trackAction({
        type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
      });
    }
  }, [destination, trackAction]);

  useEffect(() => {
    if (destination) {
      loadRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [destination]);

  // Check if destination is saved
  useEffect(() => {
    async function checkIfSaved() {
      if (!user || !destination?.slug) return;

      try {
        const { data } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .single();

        setIsSaved(!!data);
      } catch (error) {
        setIsSaved(false);
      }
    }

    checkIfSaved();
  }, [user, destination]);

  // Check if destination is visited
  useEffect(() => {
    async function checkIfVisited() {
      if (!user || !destination?.slug) return;

      try {
        const { data } = await supabase
          .from('visited_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug)
          .single();

        setIsVisited(!!data);
      } catch (error) {
        setIsVisited(false);
      }
    }

    checkIfVisited();
  }, [user, destination]);

  const handleVisitToggle = async () => {
    if (!user || !destination) {
      if (!user) {
        router.push('/auth/login');
      }
      return;
    }

    try {
      if (isVisited) {
        // Remove visit
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);

        if (error) {
          console.error('Error removing visit:', error);
          throw error;
        }

        setIsVisited(false);
      } else {
        // Add visit with current date (no modal needed - just mark as visited)
        if (!destination.slug) {
          alert('Invalid destination. Please try again.');
          return;
        }

        const { error } = await supabase
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error adding visit:', error);
          // Check if error is related to activity_feed RLS policy
          if (error.message && error.message.includes('activity_feed') && error.message.includes('row-level security')) {
            // Visit was created but activity_feed insert failed - this is okay, continue
            console.warn('Visit created but activity_feed insert failed due to RLS policy. Visit status updated successfully.');
            setIsVisited(true);
            return;
          }
          alert(`Failed to mark as visited: ${error.message || 'Please try again.'}`);
          return;
        }

        setIsVisited(true);
        
        // Track visit action for sequence prediction
        trackAction({
          type: 'visit',
          destination_id: destination.id,
          destination_slug: destination.slug,
        });
      }
    } catch (error: any) {
      console.error('Error toggling visit:', error);
      alert(`Failed to update visit status: ${error.message || 'Please try again.'}`);
    }
  };

  const handleVisitedModalUpdate = async () => {
    // Reload visited status after modal updates
    if (!user || !destination) return;

    try {
      const { data: visitedData, error } = await supabase
        .from('visited_places')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .maybeSingle();

      if (error) {
        console.error('Error checking visited status:', error);
      }

      setIsVisited(!!visitedData);
    } catch (error) {
      console.error('Error updating visited status:', error);
    }
  };

  const loadRecommendations = async () => {
    if (!destination) return;

    setLoadingRecommendations(true);
    try {
      let response = await fetch(`/api/recommendations?limit=6`);

      // Handle 401/403 gracefully - user not authenticated
      if (response.status === 401 || response.status === 403) {
        try {
          const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
          if (relatedResponse.ok) {
            const data = await relatedResponse.json();
            setRecommendations(
              (data.related || []).map((dest: any) => ({
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
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
      }

      if (!response.ok) {
        try {
          const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
          if (relatedResponse.ok) {
            const data = await relatedResponse.json();
            setRecommendations(
              (data.related || []).map((dest: any) => ({
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
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
      }

      const data = await response.json();

      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(
          data.recommendations
            .map((rec: any) => rec.destination)
            .filter(Boolean)
            .slice(0, 6)
        );
      } else if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const cityName = capitalizeCity(destination.city);

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="w-full space-y-12">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-6"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="space-y-3">
            {/* Location */}
            <div className="flex items-center gap-2">
              <a
                href={`/city/${destination.city}`}
                className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 text-xs"
              >
                <MapPin className="h-3 w-3" />
                {destination.country ? `${cityName}, ${destination.country}` : cityName}
              </a>
            </div>

            {/* Title and Action Buttons */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold leading-tight flex-1">
                {destination.name}
              </h1>
              {user && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!isSaved) {
                        setShowSaveModal(true);
                      }
                    }}
                    className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs transition-colors flex items-center gap-1.5 ${
                      isSaved
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  {/* Visited Button with Dropdown */}
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
                </div>
              )}
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {/* Parent destination badge - show if this is nested */}
              {parentDestination && (
                <LocatedInBadge
                  parent={parentDestination}
                  onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                />
              )}
              
              {destination.category && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400">
                  {formatLabel(destination.category)}
                </span>
              )}
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <Image
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    width={12}
                    height={12}
                    className="h-3 w-3"
                    onError={(e) => {
                      // Fallback to local file if external URL fails
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
                  />
                  {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                </span>
              )}
              {destination.crown && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400">
                  Crown
                </span>
              )}
              {(enrichedData?.rating || destination.rating) && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {(enrichedData?.rating || destination.rating).toFixed(1)}
                  {enrichedData?.user_ratings_total && (
                    <span className="text-gray-400">({enrichedData.user_ratings_total.toLocaleString()})</span>
                  )}
                </span>
              )}
            </div>

            {parentDestination && (
              <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/80 dark:bg-dark-blue-900/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Located inside
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{parentDestination.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {parentDestination.category && parentDestination.city
                      ? `${parentDestination.category} · ${capitalizeCity(parentDestination.city)}`
                      : parentDestination.category || capitalizeCity(parentDestination.city || '')}
                  </p>
                </div>

                <button
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                >
                  View {parentDestination.name}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sequence Predictions - Show next suggested actions */}
        {user && predictions && predictions.predictions && predictions.predictions.length > 0 && (
          <div className="mt-4">
            <SequencePredictionsInline 
              predictions={predictions.predictions} 
              compact={false}
            />
          </div>
        )}

        {/* ML Intelligence Section */}
        {destination.id && (
          <div className="mt-4 space-y-4">
            {/* Anomaly Alert */}
            <AnomalyAlert destinationId={destination.id} type="traffic" />
            
            {/* Forecast Info */}
            <ForecastInfo destinationId={destination.id} />
            
            {/* Sentiment Analysis */}
            <SentimentDisplay destinationId={destination.id} days={30} />
            
            {/* Topics */}
            <TopicsDisplay destinationId={destination.id} minTopicSize={3} />
          </div>
        )}

        {/* Image */}
        {destination.image && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
            <Image
              src={destination.image}
              alt={`${destination.name} - ${destination.category} in ${destination.city}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              className="object-cover"
              quality={85}
              priority
            />
          </div>
        )}

        {/* About */}
        {destination.content && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-4">About</h2>
            <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {stripHtmlTags(destination.content)}
            </div>
          </div>
        )}

        {/* Opening Hours */}
        {enrichedData?.opening_hours?.weekday_text && Array.isArray(enrichedData.opening_hours.weekday_text) && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-4">Opening Hours</h2>
            <div className="space-y-2 text-sm">
              {enrichedData.opening_hours.weekday_text.map((day: string, index: number) => {
                const [dayName, hoursText] = day.split(': ');
                return (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{dayName}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{hoursText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        {enrichedData?.reviews && Array.isArray(enrichedData.reviews) && enrichedData.reviews.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-4">Top Reviews</h2>
            <div className="space-y-4">
              {enrichedData.reviews.slice(0, 3).map((review: any, idx: number) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{review.author_name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{review.rating}</span>
                        {review.relative_time_description && (
                          <span className="text-xs text-gray-500">· {review.relative_time_description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {review.text && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                      {review.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nested Destinations - Show venues within this destination */}
        {destination.nested_destinations && destination.nested_destinations.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <NestedDestinations
              destinations={destination.nested_destinations}
              parentName={destination.name}
              onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)}
            />
          </div>
        )}

        {/* Similar Destinations */}
        {(loadingRecommendations || recommendations.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-6">Similar Destinations</h2>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 items-start">
                {[1, 2, 3, 4, 5, 6].slice(0, 6).map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square rounded-2xl" />
                    <Skeleton className="h-3 rounded-full w-3/4" />
                    <Skeleton className="h-2 rounded-full w-1/2" />
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                No similar destinations found
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 items-start">
                {recommendations.slice(0, 6).map(rec => (
                  <button
                    key={rec.slug}
                    onClick={() => {
                      trackEvent({
                        event_type: 'click',
                        destination_slug: rec.slug,
                        metadata: {
                          source: 'destination_detail_recommendations',
                          category: rec.category,
                          city: rec.city,
                        },
                      });
                      router.push(`/destination/${rec.slug}`);
                    }}
                    className={`${CARD_WRAPPER} text-left group`}
                  >
                    <div className={`${CARD_MEDIA} mb-2`}>
                      {(rec.image) ? (
                        <Image
                          src={rec.image}
                          alt={`${rec.name} - ${rec.category} in ${rec.city}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          quality={75}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          <MapPin className="h-10 w-10 opacity-20" />
                        </div>
                      )}

                      {rec.michelin_stars && rec.michelin_stars > 0 && (
                        <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                          <img
                            src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                            alt="Michelin star"
                            width={12}
                            height={12}
                            className="h-3 w-3"
                            onError={(e) => {
                              // Fallback to local file if external URL fails
                              const target = e.currentTarget;
                              if (target.src !== '/michelin-star.svg') {
                                target.src = '/michelin-star.svg';
                              }
                            }}
                          />
                          {rec.michelin_stars}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className={CARD_TITLE}>
                        {rec.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {capitalizeCity(rec.city)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => router.push('/')}
            className="flex-1 min-w-[160px] px-6 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Back to catalogue
          </button>
          <button
            onClick={() => router.push(`/city/${destination.city}`)}
            className="flex-1 min-w-[160px] px-6 py-2 text-xs font-medium bg-black text-white dark:bg-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity"
          >
            Explore {cityName}
          </button>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {destination && destination.id && (
        <SaveDestinationModal
          destinationId={destination.id}
          destinationSlug={destination.slug}
          isOpen={showSaveModal}
          onClose={async () => {
            setShowSaveModal(false);
            // Reload saved status after modal closes
            if (user && destination?.slug) {
              try {
                const { data } = await supabase
                  .from('saved_places')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('destination_slug', destination.slug)
                  .single();
                setIsSaved(!!data);
              } catch {
                setIsSaved(false);
              }
            }
          }}
          onSave={async (collectionId) => {
            // Also save to saved_places for simple save functionality
            if (destination.slug && user) {
              try {
                const { error } = await supabase
                  .from('saved_places')
                  .upsert({
                    user_id: user.id,
                    destination_slug: destination.slug,
                  });
                if (!error) {
                  setIsSaved(true);
                  
                  // Track save action for sequence prediction
                  trackAction({
                    type: 'save',
                    destination_id: destination.id,
                    destination_slug: destination.slug,
                  });
                }
              } catch (error) {
                console.error('Error saving to saved_places:', error);
              }
            }
            setShowSaveModal(false);
          }}
        />
      )}

      {/* Visited Modal */}
      {destination && (
        <VisitedModal
          destinationSlug={destination.slug}
          destinationName={destination.name}
          isOpen={showVisitedModal}
          onClose={() => {
            setShowVisitedModal(false);
            // Refresh visited status - will revert to false if modal was cancelled without saving
            handleVisitedModalUpdate();
          }}
          onUpdate={handleVisitedModalUpdate}
        />
      )}
    </main>
  );
}
