'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Edit2, Globe, Lock } from 'lucide-react';
import Image from 'next/image';
import { PageLoader } from '@/components/LoadingStates';
import { EmptyState } from '@/components/EmptyStates';

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
  const collectionId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [collection, setCollection] = useState<any>(null);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [updating, setUpdating] = useState(false);

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
          .from('collections')
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
            .select('slug, name, city, category, image')
            .in('slug', slugs);

          if (destData) {
            setDestinations(destData);
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
        .from('collections')
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
      alert('Failed to update collection');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      // Delete list items first
      await supabase
        .from('list_items')
        .delete()
        .eq('list_id', collectionId);

      // Delete collection
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      router.push('/account');
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
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
        .from('collections')
        .update as any)({ destination_count: Math.max(0, (collection.destination_count || 0) - 1) })
        .eq('id', collectionId);
    } catch (error) {
      console.error('Error removing destination:', error);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <PageLoader />
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
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
    <main className="w-full px-6 md:px-10 lg:px-12 py-20">
      <div className="w-full">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.push('/account')}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-6"
            aria-label="Back to Account"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{collection.emoji || '📚'}</span>
                <h1 className="text-2xl font-light">{collection.name}</h1>
              </div>
              {collection.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400">
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:opacity-80 rounded-2xl transition-opacity text-xs font-medium flex items-center gap-2"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={handleDeleteCollection}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:opacity-80 rounded-2xl transition-opacity text-xs font-medium flex items-center gap-2"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Destinations Grid */}
        {destinations.length === 0 ? (
          <EmptyState
            icon="🏞️"
            title="No places in this collection yet"
            description="Browse destinations and add them to this collection"
            actionLabel="Browse Destinations"
            actionHref="/"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
            {destinations.map((destination) => (
              <div key={destination.slug} className="group relative">
                <button
                  onClick={() => router.push(`/destination/${destination.slug}`)}
                  className="w-full text-left"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 mb-2">
                    {destination.image ? (
                      <Image
                        src={destination.image}
                        alt={destination.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                        <span className="text-4xl">🏞️</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xs font-medium line-clamp-2 mb-1">{destination.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {capitalizeCity(destination.city)}
                  </p>
                </button>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDestination(destination.slug);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full hover:opacity-80 transition-opacity opacity-0 group-hover:opacity-100"
                  title="Remove from collection"
                >
                  <Trash2 className="h-3 w-3 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Collection Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light">Edit Collection</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:opacity-60 transition-opacity"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-public"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="edit-public" className="text-xs">
                  Make this collection public
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-80 transition-opacity text-sm font-medium"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCollection}
                  disabled={!editName.trim() || updating}
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
