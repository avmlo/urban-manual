import type { Destination } from '@/types/destination';
import type { UserProfile } from '@/types/personalization';
import { createServiceRoleClient } from '@/lib/supabase-server';

export type FilterRow = { city: string | null; category: string | null };

function getAdminClient() {
  try {
    return createServiceRoleClient();
  } catch (error: any) {
    // If service role client creation fails, log and return null
    // The calling functions will handle the null case
    console.warn('[Homepage Loaders] Failed to create service role client:', error?.message);
    return null as any; // Return placeholder to prevent crashes
  }
}

export async function getUserProfileById(userId: string) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return null;
  }
  
  try {
    const { data, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as UserProfile | null;
  } catch (error: any) {
    // If it's a placeholder client error, return null gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return null;
    }
    throw error;
  }
}

export async function getVisitedSlugsForUser(userId: string) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
      .from('visited_places')
      .select('destination_slug')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Array<{ destination_slug: string | null }>)
      .map(entry => entry.destination_slug)
      .filter((slug): slug is string => Boolean(slug));
  } catch (error: any) {
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}

export async function getFilterRows(limit = 1000) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
      .from('destinations')
      .select('city, category')
      .is('parent_destination_id', null)
      .limit(limit)
      .order('city');

    if (error) {
      throw error;
    }

    return (data ?? []) as FilterRow[];
  } catch (error: any) {
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}

export async function getHomepageDestinations(limit = 500) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return [];
  }
  
  try {
    const { data, error } = await adminClient
      .from('destinations')
      .select('slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, parent_destination_id, opening_hours_json, timezone_id, utc_offset, created_at')
      .is('parent_destination_id', null)
      .limit(limit)
      .order('created_at', { ascending: false, nullsLast: true })
      .order('id', { ascending: false }); // Fallback: newer IDs (higher numbers) first

    if (error) {
      throw error;
    }

    return (data ?? []) as Destination[];
  } catch (error: any) {
    // If it's a placeholder client error, return empty array gracefully
    if (error?.message?.includes('placeholder') || error?.message?.includes('invalid')) {
      return [];
    }
    throw error;
  }
}
