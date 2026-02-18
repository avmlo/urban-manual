import { create } from "zustand";
import { useMemo } from "react";
import type {
  Resource,
  Note,
  ResourceDocument,
  ResourceFilters,
  LayoutMode,
  PanelView,
} from "./types";
import { MOCK_RESOURCES, MOCK_NOTES } from "./mock-data";

interface ResourceLibraryState {
  // Data
  resources: Resource[];
  notes: Note[];
  documents: ResourceDocument[];

  // UI State
  selectedResourceId: string | null;
  panelView: PanelView;
  layoutMode: LayoutMode;
  filters: ResourceFilters;
  activeDetailTab: string;

  // Actions — Resources
  addResource: (resource: Resource) => void;
  addResources: (resources: Resource[]) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  // Actions — Notes
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Actions — Documents
  addDocument: (doc: ResourceDocument) => void;
  deleteDocument: (id: string) => void;

  // Actions — UI
  selectResource: (id: string | null) => void;
  setPanelView: (view: PanelView) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setFilters: (filters: Partial<ResourceFilters>) => void;
  resetFilters: () => void;
  setActiveDetailTab: (tab: string) => void;
}

const DEFAULT_FILTERS: ResourceFilters = {
  search: "",
  location: null,
  type: null,
  keywords: [],
  affiliates: null,
};

export const useResourceLibraryStore = create<ResourceLibraryState>(
  (set) => ({
    // Data — seeded with mock data
    resources: MOCK_RESOURCES,
    notes: MOCK_NOTES,
    documents: [],

    // UI State
    selectedResourceId: null,
    panelView: "list",
    layoutMode: "split",
    filters: { ...DEFAULT_FILTERS },
    activeDetailTab: "details",

    // Resource CRUD
    addResource: (resource) =>
      set((state) => ({ resources: [...state.resources, resource] })),

    addResources: (resources) =>
      set((state) => ({ resources: [...state.resources, ...resources] })),

    updateResource: (id, updates) =>
      set((state) => ({
        resources: state.resources.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ),
      })),

    deleteResource: (id) =>
      set((state) => ({
        resources: state.resources.filter((r) => r.id !== id),
        notes: state.notes.filter((n) => n.resourceId !== id),
        documents: state.documents.filter((d) => d.resourceId !== id),
        selectedResourceId:
          state.selectedResourceId === id ? null : state.selectedResourceId,
        panelView: state.selectedResourceId === id ? "list" : state.panelView,
      })),

    // Note CRUD
    addNote: (note) =>
      set((state) => ({ notes: [...state.notes, note] })),

    updateNote: (id, updates) =>
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      })),

    deleteNote: (id) =>
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      })),

    // Document CRUD
    addDocument: (doc) =>
      set((state) => ({ documents: [...state.documents, doc] })),

    deleteDocument: (id) =>
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      })),

    // UI Actions
    selectResource: (id) =>
      set({
        selectedResourceId: id,
        panelView: id ? "detail" : "list",
        activeDetailTab: "details",
      }),

    setPanelView: (view) => set({ panelView: view }),

    setLayoutMode: (mode) => set({ layoutMode: mode }),

    setFilters: (partial) =>
      set((state) => ({
        filters: { ...state.filters, ...partial },
      })),

    resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

    setActiveDetailTab: (tab) => set({ activeDetailTab: tab }),
  })
);

/** Derive filtered resources from store state. Call inside a React component. */
export function useFilteredResources(): Resource[] {
  const resources = useResourceLibraryStore((s) => s.resources);
  const filters = useResourceLibraryStore((s) => s.filters);

  return useMemo(() => {
    let filtered = resources;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
    }

    if (filters.type) {
      filtered = filtered.filter((r) => r.type === filters.type);
    }

    if (filters.location) {
      filtered = filtered.filter((r) =>
        r.address.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.keywords.length > 0) {
      filtered = filtered.filter((r) =>
        filters.keywords.some((kw) =>
          r.tags.some((t) => t.toLowerCase().includes(kw.toLowerCase()))
        )
      );
    }

    if (filters.affiliates) {
      filtered = filtered.filter((r) =>
        r.affiliates.some((a) =>
          a.toLowerCase().includes(filters.affiliates!.toLowerCase())
        )
      );
    }

    return filtered;
  }, [resources, filters]);
}

/** Get a single resource by ID. */
export function useSelectedResource(): Resource | null {
  const selectedId = useResourceLibraryStore((s) => s.selectedResourceId);
  const resources = useResourceLibraryStore((s) => s.resources);
  return useMemo(
    () => resources.find((r) => r.id === selectedId) ?? null,
    [resources, selectedId]
  );
}

/** Get notes for the currently selected resource. */
export function useSelectedResourceNotes(): Note[] {
  const selectedId = useResourceLibraryStore((s) => s.selectedResourceId);
  const notes = useResourceLibraryStore((s) => s.notes);
  return useMemo(
    () => notes.filter((n) => n.resourceId === selectedId),
    [notes, selectedId]
  );
}

/** Get documents for the currently selected resource. */
export function useSelectedResourceDocuments(): ResourceDocument[] {
  const selectedId = useResourceLibraryStore((s) => s.selectedResourceId);
  const documents = useResourceLibraryStore((s) => s.documents);
  return useMemo(
    () => documents.filter((d) => d.resourceId === selectedId),
    [documents, selectedId]
  );
}
