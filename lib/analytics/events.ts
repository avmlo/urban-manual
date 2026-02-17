'use client';

// Note: Statsig event tracking is handled by the @statsig/web-analytics plugin
// which automatically tracks page views and user interactions. This module
// provides additional custom event tracking to our own analytics backend.

export type AnalyticsEvent =
  | { type: 'page_view'; path: string; duration?: number; referrer?: string }
  | { type: 'destination_viewed'; destinationId: string; destinationSlug: string; category: string; city?: string }
  | { type: 'destination_saved'; destinationId: string; destinationSlug: string; category: string }
  | { type: 'destination_removed'; destinationId: string; destinationSlug: string }
  | { type: 'trip_created'; tripId: string; numDays: number; city?: string }
  | { type: 'trip_shared'; tripId: string; method: 'link' | 'social' | 'email' }
  | { type: 'place_added_to_trip'; placeId: string; tripId: string; day: number }
  | { type: 'place_removed_from_trip'; placeId: string; tripId: string }
  | { type: 'search_performed'; query: string; resultCount: number; source?: 'header' | 'page' | 'ai' }
  | { type: 'ai_search_used'; query: string; hasFallback: boolean; responseTime?: number }
  | { type: 'filter_applied'; filters: string[]; filterType: string }
  | { type: 'account_created'; source: 'google' | 'apple' | 'email' }
  | { type: 'profile_updated'; fields: string[] }
  | { type: 'settings_changed'; setting: string; value: unknown }
  | { type: 'collection_created'; collectionId: string; name: string }
  | { type: 'collection_shared'; collectionId: string }
  | { type: 'map_interaction'; action: 'pan' | 'zoom' | 'marker_click' | 'cluster_click'; location?: string }
  | { type: 'external_link_clicked'; destinationId: string; linkType: 'website' | 'maps' | 'booking' }
  | { type: 'comparison_started'; destinationIds: string[] }
  | { type: 'comparison_completed'; chosenId: string; rejectedIds: string[] }
  | { type: 'onboarding_step'; step: number; stepName: string; completed: boolean }
  | { type: 'error_occurred'; errorType: string; errorMessage: string; context?: string }
  | { type: 'hero_impression'; variant: 'control' | 'simplified' }
  | { type: 'hero_cta_clicked'; variant: 'control' | 'simplified'; ctaType: 'explore' | 'ai_concierge' }
  | { type: 'hero_search_submitted'; variant: 'control' | 'simplified'; query: string };

interface EventMetadata {
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
  viewport?: { width: number; height: number };
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('um_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('um_session_id', sessionId);
  }
  return sessionId;
}

function getEventMetadata(): EventMetadata {
  if (typeof window === 'undefined') {
    return {
      timestamp: Date.now(),
      url: '',
      userAgent: '',
    };
  }

  return {
    timestamp: Date.now(),
    url: window.location.pathname,
    userAgent: navigator.userAgent,
    sessionId: getSessionId(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

async function sendEventToBackend(event: AnalyticsEvent, metadata: EventMetadata): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        ...metadata,
      }),
      keepalive: true,
    });

    if (!response.ok) {
      console.warn('[Analytics] Failed to send event:', response.status);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to send event:', error);
  }
}

/**
 * Track an analytics event
 * Sends to our custom analytics backend for dashboard reporting
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;

  const metadata = getEventMetadata();

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]', event.type, event);
  }

  // Send to custom analytics backend
  sendEventToBackend(event, metadata);
}

/**
 * Track page view with enhanced metadata
 */
export function trackPageView(path?: string): void {
  trackEvent({
    type: 'page_view',
    path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  });
}

/**
 * Track destination interactions
 */
export function trackDestinationView(
  destinationId: string | number,
  destinationSlug: string,
  category: string,
  city?: string
): void {
  trackEvent({
    type: 'destination_viewed',
    destinationId: String(destinationId),
    destinationSlug,
    category,
    city,
  });
}

export function trackDestinationSave(
  destinationId: string | number,
  destinationSlug: string,
  category: string
): void {
  trackEvent({
    type: 'destination_saved',
    destinationId: String(destinationId),
    destinationSlug,
    category,
  });
}

export function trackDestinationRemove(
  destinationId: string | number,
  destinationSlug: string
): void {
  trackEvent({
    type: 'destination_removed',
    destinationId: String(destinationId),
    destinationSlug,
  });
}

/**
 * Track search interactions
 */
export function trackSearch(
  query: string,
  resultCount: number,
  source?: 'header' | 'page' | 'ai'
): void {
  trackEvent({
    type: 'search_performed',
    query,
    resultCount,
    source,
  });
}

export function trackAISearch(
  query: string,
  hasFallback: boolean,
  responseTime?: number
): void {
  trackEvent({
    type: 'ai_search_used',
    query,
    hasFallback,
    responseTime,
  });
}

/**
 * Track trip interactions
 */
export function trackTripCreated(tripId: string, numDays: number, city?: string): void {
  trackEvent({
    type: 'trip_created',
    tripId,
    numDays,
    city,
  });
}

export function trackTripShared(tripId: string, method: 'link' | 'social' | 'email'): void {
  trackEvent({
    type: 'trip_shared',
    tripId,
    method,
  });
}

export function trackPlaceAddedToTrip(placeId: string, tripId: string, day: number): void {
  trackEvent({
    type: 'place_added_to_trip',
    placeId,
    tripId,
    day,
  });
}

/**
 * Track filter interactions
 */
export function trackFilterApplied(filters: string[], filterType: string): void {
  trackEvent({
    type: 'filter_applied',
    filters,
    filterType,
  });
}

/**
 * Track external link clicks
 */
export function trackExternalLinkClick(
  destinationId: string | number,
  linkType: 'website' | 'maps' | 'booking'
): void {
  trackEvent({
    type: 'external_link_clicked',
    destinationId: String(destinationId),
    linkType,
  });
}

/**
 * Track errors for monitoring
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  context?: string
): void {
  trackEvent({
    type: 'error_occurred',
    errorType,
    errorMessage,
    context,
  });
}

/**
 * Track map interactions
 */
export function trackMapInteraction(
  action: 'pan' | 'zoom' | 'marker_click' | 'cluster_click',
  location?: string
): void {
  trackEvent({
    type: 'map_interaction',
    action,
    location,
  });
}

/**
 * Track onboarding progress
 */
export function trackOnboardingStep(
  step: number,
  stepName: string,
  completed: boolean
): void {
  trackEvent({
    type: 'onboarding_step',
    step,
    stepName,
    completed,
  });
}

/**
 * Track hero A/B test events
 */
export function trackHeroImpression(variant: 'control' | 'simplified'): void {
  trackEvent({ type: 'hero_impression', variant });
}

export function trackHeroCTAClick(variant: 'control' | 'simplified', ctaType: 'explore' | 'ai_concierge'): void {
  trackEvent({ type: 'hero_cta_clicked', variant, ctaType });
}

export function trackHeroSearchSubmit(variant: 'control' | 'simplified', query: string): void {
  trackEvent({ type: 'hero_search_submitted', variant, query });
}

export { getSessionId };
