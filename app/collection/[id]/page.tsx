'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Edit2, Globe, Lock, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import { CollectionDetailSkeleton } from '@/components/LoadingStates';
import { EmptyState } from '@/components/EmptyStates';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import type { Destination } from '@/types/destination';
import { toast } from '@/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog';

// Helper function to capitalize city names
function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params?.id ? (params.id as string) : '';

  const [user, setUser] = useState<any>(null);
  const [collection, setCollection] = useState<any>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [slugToRemove, setSlugToRemove] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function loadCollection() {
      if (!user || !collectionId) return;

      try {
        // Fetch collection
        const { data: collectionData, error: collectionError } = await supabase
          .from('lists')
          .select('*')
          .eq('id', collectionId)
          .eq('user_id', user.id)
          .single();

        if (collectionError) throw collectionError;
        if (!collectionData) {
          router.push('/account');
          return;
        }

        const collection = collectionData as any;
        setCollection(collection);
        setEditName(collection.name);
        setEditDescription(collection.description || '');
        setEditPublic(collection.is_public);

        // Fetch collection items (using lists/list_items tables as they exist)
        const { data: listItems, error: itemsError } = await supabase
          .from('list_items')
          .select('destination_slug')
          .eq('list_id', collectionId);

        if (itemsError) throw itemsError;

        if (listItems && listItems.length > 0) {
          const slugs = (listItems as any[]).map((item: any) => item.destination_slug);
          const { data: destData } = await supabase
            .from('destinations')
            .select('*')
            .in('slug', slugs);

          if (destData) {
            setDestinations(destData as Destination[]);
          }
        }
      } catch (error) {
        console.error('Error loading collection:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCollection();
  }, [user, collectionId, router]);

  const handleUpdateCollection = async () => {
    if (!editName.trim()) return;

    setUpdating(true);
    try {
      const { error } = await (supabase
        .from('lists')
        .update as any)({
          name: editName.trim(),
          description: editDescription.trim() || null,
          is_public: editPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCollection({
        ...collection,
        name: editName.trim(),
        description: editDescription.trim(),
        is_public: editPublic
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Failed to update collection');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCollection = async () => {
    try {
      // Delete list items first
      await supabase
        .from('list_items')
        .delete()
        .eq('list_id', collectionId);

      // Delete collection
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Collection deleted');
      router.push('/account');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleRemoveDestination = async (slug: string) => {
    try {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', collectionId)
        .eq('destination_slug', slug);

      if (error) throw error;

      setDestinations(destinations.filter(d => d.slug !== slug));

      // Update count
      await (supabase
        .from('lists')
        .update as any)({ destination_count: Math.max(0, (collection.destination_count || 0) - 1) })
        .eq('id', collectionId);

      toast.success('Place removed from collection');
    } catch (error) {
      console.error('Error removing destination:', error);
      toast.error('Failed to remove place');
    } finally {
      setRemoveDialogOpen(false);
      setSlugToRemove(null);
    }
  };

  const openRemoveDialog = (slug: string) => {
    setSlugToRemove(slug);
    setRemoveDialogOpen(true);
  };

  if (loading) {
    return <CollectionDetailSkeleton />;
  }

  if (!collection) {
    return (
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <EmptyState
          icon="❓"
          title="Collection not found"
          description="This collection may have been deleted"
          actionLabel="Back to Account"
          actionHref="/account"
        />
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Header Background */}
      <div className="h-48 w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />
      
      <div className="max-w-5xl mx-auto px-6 md:px-10 -mt-12">
        {/* Header Content */}
        <div className="mb-12">
          <button
            onClick={() => router.push('/account')}
            className="mb-6 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
            aria-label="Back to Account"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Account
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-3xl">
                  {collection.emoji || '📚'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{collection.name}</h1>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                    <span>{destinations.length} places</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {collection.is_public ? (
                        <>
                          <Globe className="h-3 w-3" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Private</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {collection.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-xs font-medium flex items-center gap-2 shadow-sm"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-100 dark:hover:border-red-900/30 rounded-xl transition-colors text-xs font-medium flex items-center gap-2 shadow-sm text-gray-600 dark:text-gray-400"
                aria-label="Delete collection"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Destinations List */}
        <div className="space-y-4 pb-20">
          {destinations.length === 0 ? (
            <EmptyState
              icon="🏞️"
              title="No places in this collection yet"
              description="Browse destinations and add them to this collection"
              actionLabel="Browse Destinations"
              actionHref="/"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {destinations.map((destination) => (
                <div key={destination.slug} className="relative group">
                  <HorizontalDestinationCard
                    destination={destination}
                    onClick={() => router.push(`/destination/${destination.slug}`)}
                    showBadges={true}
                    className="pr-12" // Make room for delete button
                  />
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openRemoveDialog(destination.slug);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${destination.name} from collection`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Collection Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Edit Collection</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="edit-public"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="edit-public" className="text-sm font-medium cursor-pointer">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCollection}
                  disabled={!editName.trim() || updating}
                  className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{collection?.name}"? This will remove all places from this collection. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection} className="bg-red-600 hover:bg-red-700">
              Delete Collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Destination Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this place from the collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => slugToRemove && handleRemoveDestination(slugToRemove)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
