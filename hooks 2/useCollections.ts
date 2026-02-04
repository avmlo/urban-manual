import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/personalization';

export function useCollections(userId: string | undefined) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadCollections();
  }, [userId]);

  async function loadCollections() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('collections')
        .select(`
          *,
          saved_destinations(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      // Transform data to include destination_count
      const transformedData = (data || []).map((collection: any) => ({
        ...collection,
        destination_count: collection.saved_destinations?.[0]?.count || 0,
      }));

      setCollections(transformedData);
    } catch (err) {
      console.error('Error loading collections:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  async function createCollection(collection: {
    name: string;
    description?: string;
    emoji?: string;
    color?: string;
  }): Promise<Collection | null> {
    if (!userId) return null;

    try {
      // Use API endpoint for better error handling and RLS compliance
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      await loadCollections();
      return data;
    } catch (err: any) {
      console.error('Error creating collection:', err);
      throw err;
    }
  }

  async function updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<void> {
    if (!userId) return;

    try {
      const { error: err } = await (supabase
        .from('collections')
        .update as any)({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (err) throw err;
      await loadCollections();
    } catch (err) {
      console.error('Error updating collection:', err);
      throw err;
    }
  }

  async function deleteCollection(collectionId: string): Promise<void> {
    if (!userId) return;

    try {
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
      await loadCollections();
    } catch (err) {
      console.error('Error deleting collection:', err);
      throw err;
    }
  }

  return {
    collections,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    refresh: loadCollections,
  };
}

