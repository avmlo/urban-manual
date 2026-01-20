'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Destination } from '@/types/destination';

interface DestinationFilters {
  city?: string;
  category?: string;
  enriched?: 'all' | 'enriched' | 'not_enriched';
  missingData?: 'all' | 'no_image' | 'no_description' | 'no_content';
  crown?: boolean;
  michelin?: boolean;
  status?: 'all' | 'draft' | 'published' | 'archived';
  search?: string;
}

interface PaginationOptions {
  page: number;
  perPage: number;
}

// Query keys for cache management
export const destinationKeys = {
  all: ['destinations'] as const,
  lists: () => [...destinationKeys.all, 'list'] as const,
  list: (filters: DestinationFilters, pagination: PaginationOptions) =>
    [...destinationKeys.lists(), filters, pagination] as const,
  details: () => [...destinationKeys.all, 'detail'] as const,
  detail: (id: number) => [...destinationKeys.details(), id] as const,
};

/**
 * Fetch destinations with filters and pagination
 */
export function useDestinations(
  filters: DestinationFilters = {},
  pagination: PaginationOptions = { page: 1, perPage: 24 }
) {
  return useQuery({
    queryKey: destinationKeys.list(filters, pagination),
    queryFn: async () => {
      let query = supabase
        .from('destinations')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true });

      // Apply filters
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.enriched === 'enriched') {
        query = query.not('last_enriched_at', 'is', null);
      } else if (filters.enriched === 'not_enriched') {
        query = query.is('last_enriched_at', null);
      }
      if (filters.crown) {
        query = query.eq('crown', true);
      }
      if (filters.michelin) {
        query = query.gt('michelin_stars', 0);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.perPage;
      const to = from + pagination.perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        destinations: (data || []) as Destination[],
        totalCount: count || 0,
      };
    },
  });
}

/**
 * Fetch a single destination by ID
 */
export function useDestination(id: number | null) {
  return useQuery({
    queryKey: destinationKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Destination;
    },
    enabled: !!id,
  });
}

/**
 * Create a new destination with optimistic update
 */
export function useCreateDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (destination: Partial<Destination>) => {
      const { data, error } = await supabase
        .from('destinations')
        .insert([destination])
        .select()
        .single();

      if (error) throw error;
      return data as Destination;
    },
    onSuccess: () => {
      // Invalidate all destination lists to refetch
      queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
    },
  });
}

/**
 * Update a destination with optimistic update
 */
export function useUpdateDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Destination> }) => {
      const { data, error } = await supabase
        .from('destinations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Destination;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: destinationKeys.detail(id) });

      // Snapshot previous value
      const previousDestination = queryClient.getQueryData(destinationKeys.detail(id));

      // Optimistically update the cache
      queryClient.setQueryData(destinationKeys.detail(id), (old: Destination | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previousDestination };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousDestination) {
        queryClient.setQueryData(destinationKeys.detail(id), context.previousDestination);
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: destinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
    },
  });
}

/**
 * Delete a destination
 */
export function useDeleteDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
    },
  });
}

/**
 * Bulk update destinations (e.g., crown toggle, category change)
 */
export function useBulkUpdateDestinations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: number[]; updates: Partial<Destination> }) => {
      const { data, error } = await supabase
        .from('destinations')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) throw error;
      return data as Destination[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
    },
  });
}

/**
 * Toggle crown status for a destination
 */
export function useToggleCrown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, crown }: { id: number; crown: boolean }) => {
      const { data, error } = await supabase
        .from('destinations')
        .update({ crown })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Destination;
    },
    onMutate: async ({ id, crown }) => {
      await queryClient.cancelQueries({ queryKey: destinationKeys.detail(id) });

      const previousDestination = queryClient.getQueryData(destinationKeys.detail(id));

      queryClient.setQueryData(destinationKeys.detail(id), (old: Destination | undefined) => {
        if (!old) return old;
        return { ...old, crown };
      });

      return { previousDestination };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousDestination) {
        queryClient.setQueryData(destinationKeys.detail(id), context.previousDestination);
      }
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: destinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: destinationKeys.lists() });
    },
  });
}
