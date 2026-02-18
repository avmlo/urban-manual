"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { DestinationListPanel, ShowDestListButton } from "./DestinationListPanel";
import { DestinationDetailPanel } from "./DestinationDetailPanel";
import { DestinationMapView } from "./DestinationMapView";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/ui/resizable";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Toast {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  safeError?: (e: unknown, msg?: string) => void;
}

interface DestinationLibraryProps {
  toast: Toast;
  headerSlot?: React.ReactNode;
}

export function DestinationLibrary({ toast, headerSlot }: DestinationLibraryProps) {
  const searchParams = useSearchParams();

  // Data state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);

  // Detail editing state
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<Partial<Destination> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store state
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);
  const selectedSlug = useDestinationLibraryStore((s) => s.selectedDestinationSlug);
  const showDetail = useDestinationLibraryStore((s) => s.showDetail);
  const selectDestination = useDestinationLibraryStore((s) => s.selectDestination);
  const closeDetail = useDestinationLibraryStore((s) => s.closeDetail);
  const page = useDestinationLibraryStore((s) => s.page);
  const itemsPerPage = useDestinationLibraryStore((s) => s.itemsPerPage);
  const filters = useDestinationLibraryStore((s) => s.filters);

  // Auto-open editor when slug query parameter is present
  useEffect(() => {
    const slug = searchParams?.get("slug");
    if (slug) {
      selectDestination(slug);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("slug");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, selectDestination]);

  // Fetch destinations from Supabase
  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("destinations")
        .select("*", { count: "exact" });

      // Search
      if (filters.search.trim()) {
        const escaped = filters.search.trim().replace(/[%_]/g, "\\$&");
        query = query.or(
          `name.ilike.%${escaped}%,city.ilike.%${escaped}%,slug.ilike.%${escaped}%`
        );
      }

      // Category
      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      // City
      if (filters.city) {
        query = query.eq("city", filters.city);
      }

      // Enrichment
      if (filters.enriched === "enriched") {
        query = query.not("last_enriched_at", "is", null);
      } else if (filters.enriched === "not_enriched") {
        query = query.is("last_enriched_at", null);
      }

      // Crown
      if (filters.crownOnly) {
        query = query.eq("crown", true);
      }

      // Michelin
      if (filters.michelinOnly) {
        query = query.gt("michelin_stars", 0);
      }

      // Missing data
      if (filters.missingData === "no_image") {
        query = query.or("image.is.null,image.eq.");
      } else if (filters.missingData === "no_description") {
        query = query.or("description.is.null,description.eq.");
      } else if (filters.missingData === "no_content") {
        query = query.or("content.is.null,content.eq.");
      }

      // Sort
      query = query.order(filters.sort, { ascending: filters.order === "asc" });

      // Pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setDestinations(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Failed to fetch destinations:", error);
      setDestinations([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, itemsPerPage]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Fetch unique cities for filter dropdown
  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase
        .from("destinations")
        .select("city")
        .not("city", "is", null)
        .order("city");
      if (data) {
        setCities([...new Set(data.map((d) => d.city).filter(Boolean))] as string[]);
      }
    }
    fetchCities();
  }, []);

  // Fetch the full destination when one is selected
  useEffect(() => {
    if (!selectedSlug) {
      setEditingDestination(null);
      return;
    }
    // Check if already in the current page
    const local = destinations.find((d) => d.slug === selectedSlug);
    if (local) {
      setEditingDestination(local);
      setSaveState("idle");
      return;
    }
    // Otherwise fetch it
    async function fetchSingle() {
      const client = createClient({ skipValidation: true });
      const { data } = await client
        .from("destinations")
        .select("*")
        .eq("slug", selectedSlug)
        .single();
      if (data) {
        setEditingDestination(data);
        setSaveState("idle");
      }
    }
    fetchSingle();
  }, [selectedSlug, destinations]);

  // Save handler
  const handleSave = async (data: Partial<Destination>) => {
    setIsSaving(true);
    try {
      if (data.name) {
        const nameLower = data.name.toLowerCase();
        if (nameLower.startsWith("apple") || nameLower.startsWith("aesop") || nameLower.startsWith("aēsop")) {
          data.category = "Shopping";
        }
      }
      if (data.michelin_stars && data.michelin_stars > 0) {
        data.category = "Restaurant";
      }

      const client = createClient({ skipValidation: true });

      if (editingDestination) {
        const { error } = await client
          .from("destinations")
          .update(data)
          .eq("slug", editingDestination.slug);
        if (error) throw error;
      } else {
        if (!data.slug && data.name) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        }
        const { error } = await client
          .from("destinations")
          .insert([data] as Destination[]);
        if (error) throw error;
      }

      closeDetail();
      fetchDestinations();
      toast.success(editingDestination ? "Destination updated" : "Destination created");
    } catch (e: unknown) {
      if (toast.safeError) {
        toast.safeError(e, "Unable to save destination");
      } else {
        toast.error("Unable to save destination");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Autosave
  const performAutosave = useCallback(
    async (data: Partial<Destination>) => {
      if (!editingDestination) return;
      setSaveState("saving");
      try {
        if (data.name) {
          const nameLower = data.name.toLowerCase();
          if (nameLower.startsWith("apple") || nameLower.startsWith("aesop") || nameLower.startsWith("aēsop")) {
            data.category = "Shopping";
          }
        }
        if (data.michelin_stars && data.michelin_stars > 0) {
          data.category = "Restaurant";
        }

        const client = createClient({ skipValidation: true });
        const { error } = await client
          .from("destinations")
          .update(data)
          .eq("slug", editingDestination.slug);
        if (error) throw error;

        setSaveState("saved");
        fetchDestinations();
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("error");
      }
    },
    [editingDestination, fetchDestinations]
  );

  const handleAutosaveChange = useCallback(
    (data: Partial<Destination>) => {
      if (!editingDestination) return;
      pendingDataRef.current = data;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          performAutosave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, 1500);
    },
    [editingDestination, performAutosave]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!showDetail) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetail();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (pendingDataRef.current && editingDestination) {
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          performAutosave(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDetail, editingDestination, performAutosave, closeDetail]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Create new destination handler
  const handleCreateNew = () => {
    setEditingDestination(null);
    setSaveState("idle");
    // Open detail panel in create mode
    selectDestination("__new__");
  };

  // Right panel content
  function RightPanel() {
    if (showDetail && selectedSlug === "__new__") {
      return (
        <DestinationDetailPanel
          destination={{} as Destination}
          toast={toast}
          onSave={handleSave}
          isSaving={isSaving}
          saveState={saveState}
        />
      );
    }

    if (showDetail && editingDestination) {
      return (
        <DestinationDetailPanel
          destination={editingDestination}
          toast={toast}
          onSave={handleSave}
          onFormChange={handleAutosaveChange}
          isSaving={isSaving}
          saveState={saveState}
        />
      );
    }

    return (
      <DestinationListPanel
        destinations={destinations}
        totalCount={totalCount}
        loading={loading}
        cities={cities}
        onCreateNew={handleCreateNew}
        headerSlot={headerSlot}
      />
    );
  }

  return (
    <div
      className="w-full rounded-xl border border-[#E8E2D9] overflow-hidden bg-[#F5F0E8]"
      style={{ height: "calc(100vh - 72px)", minHeight: "500px" }}
    >
      {layoutMode === "split" && (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            <DestinationMapView destinations={destinations} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full bg-[#F5F0E8] overflow-hidden">
              <RightPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {layoutMode === "map-full" && (
        <div className="relative h-full">
          <DestinationMapView destinations={destinations} />
          <ShowDestListButton />
        </div>
      )}

      {layoutMode === "list-full" && (
        <div className="h-full bg-[#F5F0E8] overflow-hidden">
          <RightPanel />
        </div>
      )}
    </div>
  );
}
