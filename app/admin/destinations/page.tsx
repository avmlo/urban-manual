'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, ChevronLeft, Check, Loader2, Cloud, AlertCircle } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { ContentManager } from '@/features/admin/components/cms';
import { DestinationForm } from '@/features/admin/components/DestinationForm';
import type { Destination } from '@/types/destination';

export const dynamic = 'force-dynamic';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [showEditor, setShowEditor] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<Partial<Destination> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-open editor when slug query parameter is present
  useEffect(() => {
    const slug = searchParams?.get('slug');
    if (slug) {
      const fetchDestination = async () => {
        const supabase = createClient({ skipValidation: true });
        const { data } = await supabase
          .from('destinations')
          .select('*')
          .eq('slug', slug)
          .single();

        if (data) {
          setEditingDestination(data);
          setShowEditor(true);
          // Remove slug from URL without page reload
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('slug');
            window.history.replaceState({}, '', url.toString());
          }
        }
      };
      fetchDestination();
    }
  }, [searchParams]);

  // Prevent body scroll when editor is open
  useEffect(() => {
    if (showEditor) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showEditor]);

  const handleSaveDestination = async (data: Partial<Destination>) => {
    setIsSaving(true);
    try {
      // Auto-set category for certain names
      if (data.name) {
        const nameLower = data.name.toLowerCase();
        if (nameLower.startsWith('apple') || nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
          data.category = 'Shopping';
        }
      }
      if (data.michelin_stars && data.michelin_stars > 0) {
        data.category = 'Restaurant';
      }

      const supabase = createClient({ skipValidation: true });

      if (editingDestination) {
        const { error } = await supabase
          .from('destinations')
          .update(data)
          .eq('slug', editingDestination.slug);
        if (error) throw error;
      } else {
        if (!data.slug && data.name) {
          data.slug = data.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        const { error } = await supabase
          .from('destinations')
          .insert([data] as Destination[]);
        if (error) throw error;
      }

      // Close editor and refresh list
      setShowEditor(false);
      setEditingDestination(null);
      setRefreshKey(prev => prev + 1);
      toast.success(editingDestination ? 'Destination updated' : 'Destination created');
    } catch (e: unknown) {
      toast.safeError(e, 'Unable to save destination');
    } finally {
      setIsSaving(false);
    }
  };

  // Autosave: debounced save for editing existing destinations
  const performAutosave = useCallback(async (data: Partial<Destination>) => {
    if (!editingDestination) return;
    setSaveState('saving');
    try {
      if (data.name) {
        const nameLower = data.name.toLowerCase();
        if (nameLower.startsWith('apple') || nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
          data.category = 'Shopping';
        }
      }
      if (data.michelin_stars && data.michelin_stars > 0) {
        data.category = 'Restaurant';
      }

      const supabase = createClient({ skipValidation: true });
      const { error } = await supabase
        .from('destinations')
        .update(data)
        .eq('slug', editingDestination.slug);
      if (error) throw error;

      setSaveState('saved');
      setRefreshKey(prev => prev + 1);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [editingDestination]);

  const handleAutosaveChange = useCallback((data: Partial<Destination>) => {
    if (!editingDestination) return;
    pendingDataRef.current = data;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        performAutosave(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, 1500);
  }, [editingDestination, performAutosave]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!showEditor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowEditor(false);
        setEditingDestination(null);
      }
      // Cmd+S / Ctrl+S to force-save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (pendingDataRef.current && editingDestination) {
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          performAutosave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditor, editingDestination, performAutosave]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const handleEditDestination = (destination: Destination) => {
    setEditingDestination(destination);
    setSaveState('idle');
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setEditingDestination(null);
    setSaveState('idle');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingDestination(null);
  };

  return (
    <div className="space-y-6">
      <ContentManager
        refreshTrigger={refreshKey}
        onEditDestination={handleEditDestination}
        onCreateNew={handleCreateNew}
      />

      {/* Full-Width Content Editor — Webflow-style */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
          {/* Editor Header Bar */}
          <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="flex items-center gap-3">
              <button
                onClick={closeEditor}
                className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                title="Back to list (Esc)"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-md">
                  {editingDestination ? editingDestination.name || 'Edit Destination' : 'New Destination'}
                </h2>
                {editingDestination?.category && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-medium rounded-md">
                    {editingDestination.category}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Save state indicator */}
              {editingDestination && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {saveState === 'saving' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      <span className="text-gray-400">Saving...</span>
                    </>
                  )}
                  {saveState === 'saved' && (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Saved</span>
                    </>
                  )}
                  {saveState === 'error' && (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-red-500">Save failed</span>
                    </>
                  )}
                  {saveState === 'idle' && (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                      <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">Auto-saves</span>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={closeEditor}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Editor Content — Full Width */}
          <div className="flex-1 overflow-hidden">
            <DestinationForm
              destination={editingDestination ?? undefined}
              toast={toast}
              onSave={handleSaveDestination}
              onCancel={closeEditor}
              isSaving={isSaving}
              onFormChange={editingDestination ? handleAutosaveChange : undefined}
              saveState={saveState}
            />
          </div>
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}
