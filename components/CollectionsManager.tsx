'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Collection } from '@/types/personalization';
import { Plus, X, Edit2, Trash2, Folder, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/ui/tooltip';
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

interface CollectionsManagerProps {
  destinationId: number;
  onCollectionSelect?: (collectionId: string | null) => void;
  onClose?: () => void;
}

export function CollectionsManager({ destinationId, onCollectionSelect, onClose }: CollectionsManagerProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionEmoji, setNewCollectionEmoji] = useState('📍');
  const [creating, setCreating] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCollections();
      loadCurrentCollection();
    }
  }, [user, destinationId]);

  async function loadCollections() {
    if (!user) return;
    
    try {
      // Use API endpoint for better RLS compliance
      const response = await fetch('/api/collections');
      
      if (!response.ok) {
        throw new Error('Failed to load collections');
      }

      const { collections: data } = await response.json();
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentCollection() {
    if (!user) return;
    
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;
      
      const { data } = await supabaseClient
        .from('saved_destinations')
        .select('collection_id')
        .eq('user_id', user.id)
        .eq('destination_id', destinationId)
        .maybeSingle();

      const savedData = data as any;
      if (savedData?.collection_id) {
        setSelectedCollectionId(savedData.collection_id);
      }
    } catch (error) {
      // Destination not saved or no collection assigned
    }
  }

  async function createCollection() {
    if (!user || !newCollectionName.trim()) return;

    setCreating(true);
    try {
      // Use API endpoint for better error handling and RLS compliance
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || null,
          emoji: newCollectionEmoji,
          color: '#3B82F6',
          is_public: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Failed to create collection';
        throw new Error(errorMessage);
      }

      const { collection: data } = await response.json();

      setCollections([data, ...collections]);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowCreateForm(false);

      // Automatically select the new collection
      if (onCollectionSelect) {
        onCollectionSelect(data.id);
        setSelectedCollectionId(data.id);
      }
    } catch (error: any) {
      console.error('Error creating collection:', error);
      toast.error(error.message || 'Failed to create collection. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function selectCollection(collectionId: string | null) {
    if (!user) return;

    setSelectedCollectionId(collectionId);
    if (onCollectionSelect) {
      onCollectionSelect(collectionId);
    }
    if (onClose) {
      onClose();
    }
  }

  function handleDeleteClick(collectionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCollectionToDelete(collectionId);
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteCollection() {
    if (!user || !collectionToDelete) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Remove collection from all saved destinations
      await supabaseClient
        .from('saved_destinations')
        .update({ collection_id: null })
        .eq('collection_id', collectionToDelete);

      // Delete the collection
      const { error } = await supabaseClient
        .from('collections')
        .delete()
        .eq('id', collectionToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      setCollections(collections.filter(c => c.id !== collectionToDelete));
      if (selectedCollectionId === collectionToDelete) {
        setSelectedCollectionId(null);
      }
      toast.success('Collection deleted');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    }
  }

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Please sign in to use collections
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading collections...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collections</h3>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Create Collection</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCollectionName('');
                    setNewCollectionDescription('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close create form"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g., Tokyo Favorites"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Emoji</label>
            <input
              type="text"
              value={newCollectionEmoji}
              onChange={(e) => setNewCollectionEmoji(e.target.value)}
              maxLength={2}
              className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={createCollection}
              disabled={creating || !newCollectionName.trim()}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCollectionName('');
                setNewCollectionDescription('');
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-dark-blue-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <button
          onClick={() => selectCollection(null)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
            selectedCollectionId === null
              ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }`}
        >
          <Folder className="h-5 w-5 text-gray-400" />
          <span className="flex-1 text-left">Uncategorized</span>
        </button>

        {collections.map((collection) => (
          <button
            key={collection.id}
            onClick={() => selectCollection(collection.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all group ${
              selectedCollectionId === collection.id
                ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-lg"
            >
              {collection.emoji}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">{collection.name}</div>
              {collection.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400">{collection.description}</div>
              )}
              {collection.destination_count > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {collection.destination_count} {collection.destination_count === 1 ? 'place' : 'places'}
                </div>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleDeleteClick(collection.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                  aria-label={`Delete ${collection.name} collection`}
                >
                  <Trash2 className="h-4 w-4 text-gray-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete collection</p>
              </TooltipContent>
            </Tooltip>
          </button>
        ))}

        {collections.length === 0 && !showCreateForm && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No collections yet</p>
            <p className="text-sm">Create your first collection to organize saved places</p>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection? This will remove it from all saved destinations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCollection} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

