'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Plus, Lock, Globe, Trash2, Loader2, Heart, MapPin, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface List {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_public: boolean;
  is_collaborative: boolean;
  cover_image?: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  like_count?: number;
  cities?: string[];
}

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ListsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPublic, setNewListPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchLists = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching lists:', error);
        setLists([]);
      } else if (data) {
        // Fetch counts and cities for each list
        const listsWithCounts = await Promise.all(
          (data as any[]).map(async (list: any) => {
            const { count: itemCount } = await supabase
              .from('list_items')
              .select('*', { count: 'exact', head: true })
              .eq('list_id', list.id);

            const { count: likeCount } = await supabase
              .from('list_likes')
              .select('*', { count: 'exact', head: true })
              .eq('list_id', list.id);

            // Fetch destination cities for this list
            let cities: string[] = [];
            const { data: listItems } = await supabase
              .from('list_items')
              .select('destination_slug')
              .eq('list_id', list.id);

            if (listItems && listItems.length > 0) {
              const slugs = (listItems as any[]).map((item: any) => item.destination_slug);
              const { data: destinations } = await supabase
                .from('destinations')
                .select('city')
                .in('slug', slugs);

              if (destinations) {
                cities = Array.from(new Set((destinations as any[]).map((d: any) => d.city)));
              }
            }

            return {
              ...list,
              item_count: itemCount || 0,
              like_count: likeCount || 0,
              cities,
            };
          })
        );

        setLists(listsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createList = async () => {
    if (!user || !newListName.trim()) return;

    setCreating(true);
    const { data, error } = await (supabase
      .from('lists')
      .insert as any)([
        {
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          is_public: newListPublic,
          is_collaborative: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    } else if (data) {
      setLists([{ ...data, item_count: 0, like_count: 0, cities: [] }, ...lists]);
      setShowCreateModal(false);
      setNewListName("");
      setNewListDescription("");
      setNewListPublic(true);
    }

    setCreating(false);
  };

  const deleteList = async (listId: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete "${listName}"?`)) return;

    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId);

    if (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    } else {
      setLists(lists.filter(l => l.id !== listId));
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Lists</h1>
            <span className="text-base text-gray-600 dark:text-gray-400">
              Organize destinations into collections
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>New List</span>
          </button>
        </div>

        {/* Lists Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="rounded-2xl h-48" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <span className="text-xl text-gray-400 mb-6">No lists yet</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <div
                key={list.id}
                onClick={() => router.push(`/lists/${list.id}`)}
                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="font-bold text-lg mb-1">{list.name}</h2>
                    {list.description && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {list.description}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteList(list.id, list.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{list.item_count} {list.item_count === 1 ? 'place' : 'places'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {list.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      <span>{list.is_public ? 'Public' : 'Private'}</span>
                    </div>
                  </div>

                  {list.cities && list.cities.length > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {list.cities.slice(0, 3).map(city => capitalizeCity(city)).join(', ')}
                      {list.cities.length > 3 && ` +${list.cities.length - 3} more`}
                    </div>
                  )}
                </div>

                {(list.like_count || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    <span>{list.like_count} {list.like_count === 1 ? 'like' : 'likes'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Create New List</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">List Name *</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Tokyo Favorites"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="public"
                  checked={newListPublic}
                  onChange={(e) => setNewListPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="public" className="text-sm">
                  Make this list public
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-dark-blue-700 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createList}
                  disabled={!newListName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creating ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
