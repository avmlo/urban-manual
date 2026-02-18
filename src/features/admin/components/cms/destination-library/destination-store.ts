import { create } from "zustand";

export type SortField = "name" | "city" | "category" | "updated_at" | "created_at";
export type SortOrder = "asc" | "desc";
export type EnrichedFilter = "all" | "enriched" | "not_enriched";
export type MissingDataFilter = "all" | "no_image" | "no_description" | "no_content";
export type DestLayoutMode = "split" | "map-full" | "list-full";

export interface DestinationFilters {
  search: string;
  category: string;
  city: string;
  enriched: EnrichedFilter;
  crownOnly: boolean;
  michelinOnly: boolean;
  missingData: MissingDataFilter;
  sort: SortField;
  order: SortOrder;
}

interface DestinationLibraryState {
  // UI state
  layoutMode: DestLayoutMode;
  selectedDestinationSlug: string | null;
  showDetail: boolean;
  page: number;
  itemsPerPage: number;
  filters: DestinationFilters;

  // Actions
  setLayoutMode: (mode: DestLayoutMode) => void;
  selectDestination: (slug: string | null) => void;
  closeDetail: () => void;
  setPage: (page: number) => void;
  setItemsPerPage: (n: number) => void;
  setFilters: (partial: Partial<DestinationFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: DestinationFilters = {
  search: "",
  category: "",
  city: "",
  enriched: "all",
  crownOnly: false,
  michelinOnly: false,
  missingData: "all",
  sort: "name",
  order: "asc",
};

export const useDestinationLibraryStore = create<DestinationLibraryState>(
  (set) => ({
    layoutMode: "split",
    selectedDestinationSlug: null,
    showDetail: false,
    page: 1,
    itemsPerPage: 24,
    filters: { ...DEFAULT_FILTERS },

    setLayoutMode: (mode) => set({ layoutMode: mode }),

    selectDestination: (slug) =>
      set({
        selectedDestinationSlug: slug,
        showDetail: !!slug,
      }),

    closeDetail: () =>
      set({
        selectedDestinationSlug: null,
        showDetail: false,
      }),

    setPage: (page) => set({ page }),

    setItemsPerPage: (n) => set({ itemsPerPage: n, page: 1 }),

    setFilters: (partial) =>
      set((state) => ({
        filters: { ...state.filters, ...partial },
        page: 1, // Reset page on filter change
      })),

    resetFilters: () => set({ filters: { ...DEFAULT_FILTERS }, page: 1 }),
  })
);
