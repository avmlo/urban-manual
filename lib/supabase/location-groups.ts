/**
 * Helper functions for querying location groups
 * Handles POIs with multiple locations in the same city
 * (e.g., Blue Bottle Coffee with 10+ locations in San Francisco)
 */

import { Destination } from '@/types/destination';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch all locations for a location group
 * @param supabase - Supabase client instance
 * @param groupId - ID of the location group
 * @returns Array of all locations in the group, primary location first
 */
export async function getLocationGroupDestinations(
  supabase: SupabaseClient,
  groupId: number
): Promise<Destination[]> {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('location_group_id', groupId)
      .order('is_primary_location', { ascending: false })
      .order('location_identifier', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Destination[];
  } catch (error) {
    console.error('[Location Groups] Error fetching group destinations:', error);
    return [];
  }
}

/**
 * Fetch a destination with all its location group siblings
 * @param supabase - Supabase client instance
 * @param destinationId - ID of the destination
 * @returns Destination with all locations in the group
 */
export async function getDestinationWithLocationGroup(
  supabase: SupabaseClient,
  destinationId: number
): Promise<{ destination: Destination; allLocations: Destination[] } | null> {
  try {
    // Fetch the main destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destinationId)
      .single();

    if (error) throw error;
    if (!destination) return null;

    // If not part of a location group, return just this destination
    if (!destination.location_group_id) {
      return {
        destination: destination as Destination,
        allLocations: [destination as Destination],
      };
    }

    // Fetch all locations in the group
    const allLocations = await getLocationGroupDestinations(
      supabase,
      destination.location_group_id
    );

    return {
      destination: destination as Destination,
      allLocations,
    };
  } catch (error) {
    console.warn('[Location Groups] Error fetching destination with group:', error);
    return null;
  }
}

/**
 * Fetch a destination by slug with all its location group siblings
 * @param supabase - Supabase client instance
 * @param slug - Slug of the destination
 * @returns Destination with all locations in the group
 */
export async function getDestinationBySlugWithLocationGroup(
  supabase: SupabaseClient,
  slug: string
): Promise<{ destination: Destination; allLocations: Destination[] } | null> {
  try {
    // Fetch the main destination
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!destination || !destination.id) return null;

    return getDestinationWithLocationGroup(supabase, destination.id);
  } catch (error) {
    console.warn('[Location Groups] Error fetching destination by slug with group:', error);
    return null;
  }
}

/**
 * Get the primary location for a location group
 * @param supabase - Supabase client instance
 * @param groupId - ID of the location group
 * @returns Primary location or null
 */
export async function getPrimaryLocation(
  supabase: SupabaseClient,
  groupId: number
): Promise<Destination | null> {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('location_group_id', groupId)
      .eq('is_primary_location', true)
      .single();

    if (error) throw error;
    return data as Destination;
  } catch (error) {
    console.warn('[Location Groups] Error fetching primary location:', error);
    return null;
  }
}

/**
 * Count locations in a group
 * @param supabase - Supabase client instance
 * @param groupId - ID of the location group
 * @returns Number of locations in the group
 */
export async function countLocationGroupSize(
  supabase: SupabaseClient,
  groupId: number
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .eq('location_group_id', groupId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn('[Location Groups] Error counting group size:', error);
    return 0;
  }
}

/**
 * Create a new location group from destinations
 * @param supabase - Supabase client instance
 * @param destinationIds - Array of destination IDs to group
 * @param primaryLocationId - ID of the primary location
 * @returns The new location group ID
 */
export async function createLocationGroup(
  supabase: SupabaseClient,
  destinationIds: number[],
  primaryLocationId: number
): Promise<number | null> {
  try {
    if (destinationIds.length < 2) {
      throw new Error('Location group must have at least 2 destinations');
    }

    if (!destinationIds.includes(primaryLocationId)) {
      throw new Error('Primary location must be one of the group destinations');
    }

    // Use the first destination's ID as the group ID
    const groupId = Math.max(...destinationIds);

    // Update all destinations to be part of the group
    for (const destId of destinationIds) {
      const { error } = await supabase
        .from('destinations')
        .update({
          location_group_id: groupId,
          is_primary_location: destId === primaryLocationId,
        })
        .eq('id', destId);

      if (error) throw error;
    }

    return groupId;
  } catch (error) {
    console.error('[Location Groups] Error creating location group:', error);
    return null;
  }
}

/**
 * Remove a destination from its location group
 * @param supabase - Supabase client instance
 * @param destinationId - ID of the destination to remove
 */
export async function removeFromLocationGroup(
  supabase: SupabaseClient,
  destinationId: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('destinations')
      .update({
        location_group_id: null,
        is_primary_location: false,
        location_identifier: null,
      })
      .eq('id', destinationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[Location Groups] Error removing from group:', error);
    return false;
  }
}

/**
 * Set a new primary location for a group
 * @param supabase - Supabase client instance
 * @param groupId - ID of the location group
 * @param newPrimaryId - ID of the new primary location
 */
export async function setPrimaryLocation(
  supabase: SupabaseClient,
  groupId: number,
  newPrimaryId: number
): Promise<boolean> {
  try {
    // Remove primary flag from all locations in the group
    const { error: resetError } = await supabase
      .from('destinations')
      .update({ is_primary_location: false })
      .eq('location_group_id', groupId);

    if (resetError) throw resetError;

    // Set the new primary location
    const { error: setPrimaryError } = await supabase
      .from('destinations')
      .update({ is_primary_location: true })
      .eq('id', newPrimaryId)
      .eq('location_group_id', groupId);

    if (setPrimaryError) throw setPrimaryError;
    return true;
  } catch (error) {
    console.error('[Location Groups] Error setting primary location:', error);
    return false;
  }
}

/**
 * Get destinations for city guides (primary locations only)
 * @param supabase - Supabase client instance
 * @param city - City name
 * @returns Array of destinations (primary locations only for multi-location POIs)
 */
export async function getCityGuideDestinations(
  supabase: SupabaseClient,
  city: string
): Promise<Destination[]> {
  try {
    const { data, error } = await supabase.from('city_guide_destinations').select('*').eq('city', city);

    if (error) throw error;
    return (data || []) as Destination[];
  } catch (error) {
    console.warn('[Location Groups] Error fetching city guide destinations:', error);
    return [];
  }
}
