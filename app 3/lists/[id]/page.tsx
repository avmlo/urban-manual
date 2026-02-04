'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Destination } from "@/types/destination";
import {
  ArrowLeft,
  Globe,
  Lock,
  Edit2,
  Trash2,
  Plus,
  Share2,
  X,
  Search,
  Loader2,
  MapPin
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE } from '@/components/CardStyles';

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
}

interface ListItem {
  id: string;
  list_id: string;
  destination_slug: string;
  added_at: string;
}

export default function ListDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const listId = params.id as string;

  const [list, setList] = useState<List | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [addingDestination, setAddingDestination] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublic, setEditPublic] = useState(true);

  // Add destination state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [searching, setSearching] = useState(false);

  // Allow viewing public lists without requiring auth
  useEffect(() => {
    if (!authLoading) {
      fetchListDetails();
    }
  }, [authLoading, user, listId]);

  

  const fetchListDetails = async () => {
    if (!listId) return;
    setLoading(true);

    // Fetch list details
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !listData) {
      console.error('Error fetching list:', listError);
      router.push('/lists');
      return;
    }

    // If list is private and user is not the owner, block access
    const list = listData as any;
    if (!list.is_public && list.user_id !== user?.id) {
      router.push('/lists');
      return;
    }

    setList(list);
    setEditName(list.name);
    setEditDescription(list.description || "");
    setEditPublic(list.is_public);

    // Fetch list items
    const { data: itemsData, error: itemsError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('added_at', { ascending: false });

    if (itemsError) {
      console.error('Error fetching list items:', itemsError);
      setLoading(false);
      return;
    }

    // Fetch destination details for each item
    if (itemsData && itemsData.length > 0) {
      const slugs = itemsData.map((item: ListItem) => item.destination_slug);
      const { data: destinationsData, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .in('slug', slugs);

      if (!destError && destinationsData) {
        setDestinations(destinationsData);
      }
    }

    setLoading(false);
  };

  const updateList = async () => {
    if (!user || !list || !editName.trim()) return;

    setIsUpdating(true);
    const { error } = await (supabase
      .from('lists')
      .update as any)({
        name: editName.trim(),
        description: editDescription.trim() || null,
        is_public: editPublic,
      })
      .eq('id', list.id);

    if (error) {
      console.error('Error updating list:', error);
      alert('Failed to update list');
    } else {
      setList({
        ...list,
        name: editName.trim(),
        description: editDescription.trim() || null,
        is_public: editPublic,
      });
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  const deleteList = async () => {
    if (!list || !confirm(`Are you sure you want to delete "${list.name}"?`)) return;

    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', list.id);

    if (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    } else {
      router.push('/lists');
    }
  };

  const searchDestinations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(20);

    if (!error && data) {
      // Filter out destinations already in the list
      const existingSlugs = destinations.map((d: any) => d.slug);
      setSearchResults((data as any[]).filter((d: any) => !existingSlugs.includes(d.slug)));
    }
    setSearching(false);
  };

  const addDestinationToList = async (destination: Destination) => {
    if (!user || !list) return;

    setAddingDestination(true);
    const { error } = await (supabase
      .from('list_items')
      .insert as any)([{
        list_id: list.id,
        destination_slug: destination.slug,
      }]);

    if (error) {
      console.error('Error adding destination:', error);
      alert('Failed to add destination');
    } else {
      setDestinations([destination, ...destinations]);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddModal(false);
    }
    setAddingDestination(false);
  };

  const removeDestinationFromList = async (slug: string, name: string) => {
    if (!list || !confirm(`Remove "${name}" from this list?`)) return;

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', list.id)
      .eq('destination_slug', slug);

    if (error) {
      console.error('Error removing destination:', error);
      alert('Failed to remove destination');
    } else {
      setDestinations(destinations.filter(d => d.slug !== slug));
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/lists/${list?.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const capitalizeCity = (city: string) => {
    return city.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="container mx-auto">
        {/* Header - Improved responsive layout */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/lists')}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-4"
            aria-label="Back to Lists"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold break-words">{list.name}</h1>
                {list.is_public ? (
                  <Globe className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </div>
              {list.description && (
                <span className="block text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 break-words">
                  {list.description}
                </span>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-500">
                {destinations.length} {destinations.length === 1 ? 'place' : 'places'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {list.is_public && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
              {user?.id === list.user_id && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={deleteList}
                    className="group relative flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-colors text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add Destination Button */}
        {user?.id === list.user_id && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={addingDestination}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingDestination ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add Place</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Destinations Grid */}
        {destinations.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <MapPin className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <span className="text-xl text-gray-400 dark:text-gray-500 mb-6 block">No places in this list yet</span>
            {user?.id === list.user_id && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
              >
                Add Your First Place
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start">
            {destinations.map((destination) => (
              <div key={destination.slug} className={`${CARD_WRAPPER} group flex flex-col`}>
                <Link href={`/destination/${destination.slug}`} className="flex flex-col flex-1">
                  <div className={`${CARD_MEDIA} mb-2 hover-lift`}>
                    {(destination.image_thumbnail || destination.image) ? (
                      <Image
                        src={destination.image_thumbnail || destination.image!}
                        alt={destination.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                        <MapPin className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0 flex-1 flex flex-col">
                    <h3 className={`${CARD_TITLE} line-clamp-2 min-h-[2.5rem]`}>
                      {destination.name}
                    </h3>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-1">
                      {destination.micro_description || 
                       (destination.category && destination.city 
                         ? `${destination.category} in ${capitalizeCity(destination.city)}`
                         : destination.city 
                           ? capitalizeCity(destination.city)
                           : destination.category || '')}
                    </div>
                  </div>
                </Link>
                {user?.id === list.user_id && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeDestinationFromList(destination.slug, destination.name);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-900 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 z-10"
                    title="Remove from list"
                  >
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit List Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Edit List</h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
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
                <label htmlFor="edit-public" className="text-sm">
                  Make this list public
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-dark-blue-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateList}
                  disabled={!editName.trim() || isUpdating}
                  className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Destination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Add Place to List</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchDestinations(e.target.value);
                  }}
                  placeholder="Search destinations..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  {searchQuery ? 'No destinations found' : 'Start typing to search destinations'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {searchResults.map((destination) => (
                    <button
                      key={destination.slug}
                      onClick={() => addDestinationToList(destination)}
                      disabled={addingDestination}
                      className="text-left hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-2xl p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-2xl mb-2">
                        {destination.image && (
                          <Image
                            src={destination.image}
                            alt={destination.name}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        )}
                      </div>
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {destination.name}
                      </h3>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {capitalizeCity(destination.city)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Share List</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <span className="text-gray-600 dark:text-gray-400 mb-4">
              Anyone with this link can view this list
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/lists/${list.id}`}
                readOnly
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl text-sm"
              />
              <button
                onClick={copyShareLink}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
