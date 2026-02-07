'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Upload,
  Grid,
  List,
  Trash2,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  HardDrive,
  Download,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { Skeleton } from '@/ui/skeleton';
import { Separator } from '@/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { useConfirmDialog } from '@/components/ConfirmDialog';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  created_at: string;
  path: string;
}

type ViewMode = 'grid' | 'list';

const BUCKET_NAME = 'media';

export function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { confirm: showConfirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();

  const ITEMS_PER_PAGE = viewMode === 'grid' ? 24 : 20;

  const getFileType = (name: string): 'image' | 'video' | 'document' => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
    return 'document';
  };

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // List files from the media bucket
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) {
        throw listError;
      }

      // Filter out folders (they have no metadata)
      const validFiles = (files || []).filter(file => file.id && file.name);

      // Apply search filter
      let filteredFiles = validFiles;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredFiles = filteredFiles.filter(file =>
          file.name.toLowerCase().includes(query)
        );
      }

      setTotalCount(filteredFiles.length);

      // Paginate
      const from = (page - 1) * ITEMS_PER_PAGE;
      const paginatedFiles = filteredFiles.slice(from, from + ITEMS_PER_PAGE);

      // Get public URLs for each file
      const mediaItems: MediaItem[] = paginatedFiles.map(file => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(file.name);

        return {
          id: file.id || file.name,
          name: file.name,
          url: urlData.publicUrl,
          type: getFileType(file.name),
          size: file.metadata?.size || 0,
          created_at: file.created_at || new Date().toISOString(),
          path: file.name,
        };
      });

      setMedia(mediaItems);

      // Calculate total storage used
      const totalSize = validFiles.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
      setStorageUsed(totalSize);
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch media');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, ITEMS_PER_PAGE]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      // Refresh the list
      await fetchMedia();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (item: MediaItem) => {
    setDeleting(prev => new Set(prev).add(item.id));
    setError(null);
    try {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([item.path]);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMedia(prev => prev.filter(m => m.id !== item.id));
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      // Close preview if this item was selected
      if (selectedMedia?.id === item.id) {
        setSelectedMedia(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = media.filter(m => selectedItems.has(m.id));
    const paths = itemsToDelete.map(m => m.path);

    setError(null);
    try {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (deleteError) throw deleteError;

      // Remove from local state
      setMedia(prev => prev.filter(m => !selectedItems.has(m.id)));
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <HardDrive className="w-4 h-4" />
          <span>{formatFileSize(storageUsed)} used</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{totalCount} files</span>
        </div>
        <Button asChild className="rounded-lg" disabled={uploading}>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/10">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setError(null)}
            className="ml-auto h-8 w-8 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Search & View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search files..."
            className="pl-10 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
          <Badge variant="secondary">{selectedItems.size} selected</Badge>
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showConfirm({
              title: `Delete ${selectedItems.size} items?`,
              message: 'This action cannot be undone. The files will be permanently removed.',
              type: 'danger',
              confirmText: 'Delete',
              onConfirm: handleBulkDelete,
            })}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedItems(new Set())}
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Media Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Skeleton
              key={i}
              className={`rounded-lg ${viewMode === 'grid' ? 'aspect-square' : 'h-16'}`}
            />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">{searchQuery ? 'No files match your search' : 'No media files yet'}</p>
          <p className="text-xs mt-1">Upload files to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className={`
                group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border transition-all cursor-pointer
                ${selectedItems.has(item.id)
                  ? 'ring-1 ring-gray-400 dark:ring-gray-500 bg-black/5 dark:bg-white/5'
                  : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
              `}
              onClick={() => setSelectedMedia(item)}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Checkbox */}
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(item.id);
                }}
              >
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${selectedItems.has(item.id)
                    ? 'bg-black dark:bg-white border-black dark:border-white'
                    : 'border-white/70 bg-black/20 opacity-0 group-hover:opacity-100'}
                `}>
                  {selectedItems.has(item.id) && <Check className="w-3 h-3 text-white dark:text-black" />}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-md truncate max-w-[70%]">
                  {item.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUrl(item.url);
                  }}
                  className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {copiedUrl === item.url ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {media.map((item) => (
            <div
              key={item.id}
              className={`py-3 flex items-center justify-between ${selectedItems.has(item.id) ? 'bg-gray-50 dark:bg-gray-900 -mx-4 px-4' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                />
                <div
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyUrl(item.url)}
                  className="h-8 w-8"
                >
                  {copiedUrl === item.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMedia(item)}
                  className="h-8 w-8"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialogComponent />

      {/* Media Preview Modal */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedMedia && (
            <>
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="w-full max-h-[70vh] object-contain bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="truncate">{selectedMedia.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatFileSize(selectedMedia.size)}</span>
                  <span>{new Date(selectedMedia.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyUrl(selectedMedia.url)}
                    className="rounded-lg"
                  >
                    {copiedUrl === selectedMedia.url ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy URL
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="rounded-lg"
                  >
                    <a
                      href={selectedMedia.url}
                      download={selectedMedia.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showConfirm({
                      title: `Delete "${selectedMedia.name}"?`,
                      message: 'This action cannot be undone. The file will be permanently removed.',
                      type: 'danger',
                      confirmText: 'Delete',
                      onConfirm: () => handleDelete(selectedMedia),
                    })}
                    disabled={deleting.has(selectedMedia.id)}
                    className="ml-auto text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                  >
                    {deleting.has(selectedMedia.id) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
