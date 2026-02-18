'use client';

import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/personalization';
import { useQueryFetching, useQueryMutation } from '@/hooks/useQueryFetching';

export function useCollections(userId: string | undefined) {
  const { data, isLoading, error, invalidate } = useQueryFetching<Collection[]>(
    async () => {
      if (!userId) return [];

      const { data, error: err } = await supabase
        .from('collections')
        .select(`
          *,
          saved_destinations(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      return (data || []).map((collection: any) => ({
        ...collection,
        destination_count: collection.saved_destinations?.[0]?.count || 0,
      }));
    },
    {
      queryKey: ['collections', userId],
      enabled: !!userId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const createMutation = useQueryMutation<Collection | null, {
    name: string;
    description?: string;
    emoji?: string;
    color?: string;
  }>(
    async (collection) => {
      if (!userId) return null;

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collection.name,
          description: collection.description || null,
          emoji: collection.emoji || '📍',
          color: collection.color || '#3B82F6',
          is_public: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create collection');
      }

      const { collection: data } = await response.json();
      return data;
    },
    {
      invalidateKeys: [['collections', userId]],
    }
  );

  const updateMutation = useQueryMutation<void, { collectionId: string; updates: Partial<Collection> }>(
    async ({ collectionId, updates }) => {
      if (!userId) return;

      const { error: err } = await (supabase
        .from('collections')
        .update as any)({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (err) throw err;
    },
    {
      invalidateKeys: [['collections', userId]],
    }
  );

  const deleteMutation = useQueryMutation<void, string>(
    async (collectionId) => {
      if (!userId) return;

      // Remove collection from all saved destinations
      await (supabase
        .from('saved_destinations')
        .update as any)({ collection_id: null })
        .eq('collection_id', collectionId);

      // Delete the collection
      const { error: err } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (err) throw err;
    },
    {
      invalidateKeys: [['collections', userId]],
    }
  );

  async function createCollection(collection: {
    name: string;
    description?: string;
    emoji?: string;
    color?: string;
  }): Promise<Collection | null> {
    return createMutation.mutateAsync(collection);
  }

  async function updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<void> {
    await updateMutation.mutateAsync({ collectionId, updates });
  }

  async function deleteCollection(collectionId: string): Promise<void> {
    await deleteMutation.mutateAsync(collectionId);
  }

  return {
    collections: data ?? [],
    loading: isLoading,
    error: error,
    createCollection,
    updateCollection,
    deleteCollection,
    refresh: async () => { await invalidate(); },
  };
}
