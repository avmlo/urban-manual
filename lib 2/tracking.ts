import { createClient } from '@supabase/supabase-js';
import type { UserInteraction } from '@/types/personalization';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '' || value.includes('placeholder') || value.includes('invalid')) {
    // Only log error if we're actually trying to use it (not just checking)
    return '';
  }
  return value;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
// Support both new (publishable) and legacy (anon) key naming
const supabaseAnonKey = 
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const hasValidConfig = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder') && !supabaseAnonKey.includes('placeholder');

// Session ID management (for anonymous tracking)
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('um_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('um_session_id', sessionId);
  }
  return sessionId;
}

// Initialize session (compatibility function)
export function initializeSession(): void {
  if (typeof window !== 'undefined') {
    getSessionId();
  }
}

// Legacy tracking functions (for backward compatibility)
export function trackPageView(data?: { pageType?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Page view:', data);
  }
}

export function trackDestinationClick(data?: { destinationId?: number; destinationSlug?: string; position?: number; source?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Destination click:', data);
  }
}

export function trackSearch(data?: { query?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Search:', data);
  }
}

export function trackFilterChange(data?: { filterType?: string; value?: any }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Filter change:', data);
  }
}

export { getSessionId };

export class PersonalizationTracker {
  private supabase = hasValidConfig
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Track destination view
   */
  async trackView(
    destinationId: number,
    source?: string,
    searchQuery?: string
  ): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      // Add to visit history
      await this.supabase.from('visit_history').insert({
        user_id: this.userId,
        destination_id: destinationId,
        source,
        search_query: searchQuery,
      });

      // Add interaction
      await this.trackInteraction(destinationId, 'view');
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  }

  /**
   * Track save/unsave
   */
  async trackSave(destinationId: number, collectionId?: string): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase.from('saved_destinations').insert({
        user_id: this.userId,
        destination_id: destinationId,
        collection_id: collectionId,
      });

      await this.trackInteraction(destinationId, 'save');
    } catch (error) {
      console.error('Failed to track save:', error);
    }
  }

  /**
   * Track unsave
   */
  async trackUnsave(destinationId: number): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase
        .from('saved_destinations')
        .delete()
        .eq('user_id', this.userId)
        .eq('destination_id', destinationId);

      await this.trackInteraction(destinationId, 'unsave');
    } catch (error) {
      console.error('Failed to track unsave:', error);
    }
  }

  /**
   * Track external link clicks
   */
  async trackExternalClick(
    destinationId: number,
    type: 'website' | 'maps'
  ): Promise<void> {
    if (!this.userId) return;

    try {
      await this.trackInteraction(
        destinationId,
        type === 'website' ? 'click_website' : 'click_maps'
      );
    } catch (error) {
      console.error('Failed to track external click:', error);
    }
  }

  /**
   * Track share action
   */
  async trackShare(destinationId: number): Promise<void> {
    if (!this.userId) return;

    try {
      await this.trackInteraction(destinationId, 'share');
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  }

  /**
   * Generic interaction tracking
   */
  private async trackInteraction(
    destinationId: number,
    type: UserInteraction['interaction_type']
  ): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase.from('user_interactions').insert({
        user_id: this.userId,
        destination_id: destinationId,
        interaction_type: type,
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Update visit duration when user leaves page
   */
  async updateVisitDuration(
    destinationId: number,
    durationSeconds: number
  ): Promise<void> {
    if (!this.userId) return;

    try {
      // Get the most recent visit for this destination
      const { data: recentVisit } = await (this.supabase as any)
        .from('visit_history')
        .select('id')
        .eq('user_id', this.userId)
        .eq('destination_id', destinationId)
        .order('visited_at', { ascending: false })
        .limit(1)
        .single();

      if (recentVisit) {
        const visit = recentVisit as any;
        await (this.supabase as any)
          .from('visit_history')
          .update({ duration_seconds: durationSeconds })
          .eq('id', visit.id);
      }
    } catch (error) {
      console.error('Failed to update visit duration:', error);
    }
  }
}
