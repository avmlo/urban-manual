/**
 * Helper functions for querying nested destinations
 * Allows fetching destinations that are nested within other destinations
 * (e.g., a bar within a hotel, a restaurant within a hotel, etc.)
 */

import { Destination } from '@/types/destination';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch nested destinations for a parent destination
 * @param supabase - Supabase client instance
 * @param parentId - ID of the parent destination
 * @param includeDeep - If true, includes all nested levels recursively (default: false)
 * @returns Array of nested destinations
 */
export async function getNestedDestinations(
  supabase: SupabaseClient,
  parentId: number,
  includeDeep: boolean = false
): Promise<Destination[]> {
  try {
    if (includeDeep) {
      // Use recursive function for deep nesting
      const { data, error } = await supabase.rpc('get_all_nested_destinations', {
        parent_id: parentId,
      });

      if (error) throw error;
      return (data || []) as Destination[];
    } else {
      // Use simple function for direct children only
      const { data, error } = await supabase.rpc('get_nested_destinations', {
        parent_id: parentId,
      });

      if (error) throw error;
      return (data || []) as Destination[];
    }
  } catch (error) {
    console.warn('[Nested Destinations] Error fetching nested destinations:', error);
    return [];
  }
}

/**
 * Fetch a destination with its nested destinations populated
 * @param supabase - Supabase client instance
 * @param destinationId - ID of the destination
 * @param includeDeep - If true, includes all nested levels recursively (default: false)
 * @returns Destination with nested_destinations populated
 */
export async function getDestinationWithNested(
  supabase: SupabaseClient,
  destinationId: number,
  includeDeep: boolean = false
): Promise<Destination | null> {
  try {
    // Fetch the main destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destinationId)
      .single();

    if (error) throw error;
    if (!destination) return null;

    // Fetch nested destinations
    const nested = await getNestedDestinations(supabase, destinationId, includeDeep);

    return {
      ...destination,
      nested_destinations: nested,
    } as Destination;
  } catch (error) {
    console.warn('[Nested Destinations] Error fetching destination with nested:', error);
    return null;
  }
}

/**
 * Fetch a destination by slug with its nested destinations populated
 * @param supabase - Supabase client instance
 * @param slug - Slug of the destination
 * @param includeDeep - If true, includes all nested levels recursively (default: false)
 * @returns Destination with nested_destinations populated
 */
export async function getDestinationBySlugWithNested(
  supabase: SupabaseClient,
  slug: string,
  includeDeep: boolean = false
): Promise<Destination | null> {
  try {
    // Fetch the main destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!destination || !destination.id) return null;

    // Fetch nested destinations
    const nested = await getNestedDestinations(supabase, destination.id, includeDeep);

    return {
      ...destination,
      nested_destinations: nested,
    } as Destination;
  } catch (error) {
    console.warn('[Nested Destinations] Error fetching destination by slug with nested:', error);
    return null;
  }
}

/**
 * Check if a destination has nested destinations
 * @param supabase - Supabase client instance
 * @param destinationId - ID of the destination
 * @returns True if destination has nested destinations
 */
export async function hasNestedDestinations(
  supabase: SupabaseClient,
  destinationId: number
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .eq('parent_destination_id', destinationId);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (error) {
    console.warn('[Nested Destinations] Error checking for nested destinations:', error);
    return false;
  }
}

/**
 * Get the parent destination for a nested destination
 * @param supabase - Supabase client instance
 * @param destinationId - ID of the nested destination
 * @returns Parent destination or null
 */
export async function getParentDestination(
  supabase: SupabaseClient,
  destinationId: number
): Promise<Destination | null> {
  try {
    // First get the nested destination to find its parent
    const { data: nested, error: nestedError } = await supabase
      .from('destinations')
      .select('parent_destination_id')
      .eq('id', destinationId)
      .single();

    if (nestedError || !nested?.parent_destination_id) return null;

    // Fetch the parent destination
    const { data: parent, error: parentError } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', nested.parent_destination_id)
      .single();

    if (parentError) throw parentError;
    return parent as Destination;
  } catch (error) {
    console.warn('[Nested Destinations] Error fetching parent destination:', error);
    return null;
  }
}

