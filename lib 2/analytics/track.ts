import { createClient } from '@/lib/supabase/client';

/**
 * Track user interaction events for intelligence layer
 */
export async function trackEvent(event: {
  event_type: 'view' | 'click' | 'save' | 'search';
  destination_id?: number;
  destination_slug?: string;
  query?: string;
  metadata?: any;
}) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    // Track user interaction
    if (event.destination_id || event.destination_slug) {
      // Get destination_id from slug if needed
      let destinationId = event.destination_id;
      
      if (!destinationId && event.destination_slug) {
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', event.destination_slug)
          .single();
        
        if (dest) {
          destinationId = dest.id;
        }
      }

      if (destinationId) {
        // Insert interaction
        await supabase.from('user_interactions').insert({
          user_id: session.user.id,
          destination_id: destinationId,
          interaction_type: event.event_type,
          engagement_score: event.event_type === 'save' ? 5 : 
                          event.event_type === 'click' ? 2 : 1,
          context: event.metadata || {},
        });

        // Update destination counters
        if (event.event_type === 'view' && event.destination_slug) {
          await supabase.rpc('increment_views_by_slug', {
            dest_slug: event.destination_slug
          });
        }

        if (event.event_type === 'save' && event.destination_slug) {
          await supabase.rpc('increment_saves', {
            dest_slug: event.destination_slug
          });
        }
      }
    }
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Analytics tracking error:', error);
  }
}

