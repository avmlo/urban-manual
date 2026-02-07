'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, ChevronLeft, Check, Loader2, Cloud } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { ContentManager } from '@/features/admin/components/cms';
import { DestinationForm } from '@/features/admin/components/DestinationForm';
import type { Destination } from '@/types/destination';
import { logAuditEvent, computeChanges } from '@/lib/audit';

export const dynamic = 'force-dynamic';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [showCreateModal, setShowCreateModal] = useState(false);
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
          setShowCreateModal(true);
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

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showCreateModal) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showCreateModal]);

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
        // Snapshot current version before updating
        const slug = editingDestination.slug;
        const changes = computeChanges(editingDestination as Record<string, unknown>, data as Record<string, unknown>);

        const { error } = await supabase
          .from('destinations')
          .update(data)
          .eq('slug', slug);
        if (error) throw error;

        // Log audit trail (non-blocking)
        logAuditEvent({ action: 'update', slug, changes: changes || undefined });

        // Save version snapshot (non-blocking)
        if (editingDestination.id) {
          supabase.from('destination_versions').insert({
            destination_id: editingDestination.id,
            version_number: Date.now(),
            data: editingDestination as unknown as Record<string, unknown>,
            changed_fields: changes ? Object.keys(changes) : [],
          }).then(() => {});
        }
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

        // Log audit trail for creation (non-blocking)
        logAuditEvent({ action: 'create', slug: data.slug! });
      }

      // Close drawer and refresh list (without resetting pagination)
      setShowCreateModal(false);
      setEditingDestination(null);
      setRefreshKey(prev => prev + 1);
      toast.success(editingDestination ? 'Destination updated' : 'Destination created');
    } catch (e: unknown) {
      // ZERO JANK POLICY: Never expose raw error messages to users
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
      // Reset to idle after showing "saved" for 2s
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

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    if (!showCreateModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCreateModal(false);
        setEditingDestination(null);
      }
      // Cmd+S / Ctrl+S to force-save pending changes
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
  }, [showCreateModal, editingDestination, performAutosave]);

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
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingDestination(null);
    setSaveState('idle');
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      <ContentManager
        refreshTrigger={refreshKey}
        onEditDestination={handleEditDestination}
        onCreateNew={handleCreateNew}
      />

      {/* Create/Edit Drawer */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => {
              setShowCreateModal(false);
              setEditingDestination(null);
            }}
          />
          {/* Drawer Panel */}
          <div
            className={`fixed right-3 top-3 bottom-3 w-[calc(100%-1.5rem)] sm:w-[520px] lg:w-[560px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${
              showCreateModal ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDestination(null);
                  }}
                  className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingDestination ? editingDestination.name || 'Edit Destination' : 'New Destination'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Save state indicator */}
                {editingDestination && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {saveState === 'saving' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        <span className="text-gray-400">Saving…</span>
                      </>
                    )}
                    {saveState === 'saved' && (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Saved</span>
                      </>
                    )}
                    {saveState === 'error' && (
                      <span className="text-red-500">Save failed</span>
                    )}
                    {saveState === 'idle' && (
                      <>
                        <Cloud className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                        <span className="text-gray-300 dark:text-gray-600">⌘S</span>
                      </>
                    )}
                  </div>
                )}
              <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDestination(null);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Form (fills remaining space) */}
            <div className="flex-1 overflow-hidden">
              <DestinationForm
                destination={editingDestination ?? undefined}
                toast={toast}
                onSave={handleSaveDestination}
                onCancel={() => {
                  setShowCreateModal(false);
                  setEditingDestination(null);
                }}
                isSaving={isSaving}
                onFormChange={editingDestination ? handleAutosaveChange : undefined}
              />
            </div>
          </div>
        </>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}
