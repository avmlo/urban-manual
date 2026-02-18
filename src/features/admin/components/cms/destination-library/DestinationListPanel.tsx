"use client";

import { Maximize2, Minimize2, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { DestinationCard } from "./DestinationCard";
import { DestinationSearchBar } from "./DestinationSearchBar";
import { DestinationFilterBar } from "./DestinationFilterBar";
import { EmptyState } from "@/ui/empty-state";
import { Search } from "lucide-react";

interface DestinationListPanelProps {
  destinations: Destination[];
  totalCount: number;
  loading: boolean;
  cities: string[];
  onCreateNew: () => void;
  headerSlot?: React.ReactNode;
}

export function DestinationListPanel({
  destinations,
  totalCount,
  loading,
  cities,
  onCreateNew,
  headerSlot,
}: DestinationListPanelProps) {
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);
  const setLayoutMode = useDestinationLibraryStore((s) => s.setLayoutMode);
  const page = useDestinationLibraryStore((s) => s.page);
  const setPage = useDestinationLibraryStore((s) => s.setPage);
  const itemsPerPage = useDestinationLibraryStore((s) => s.itemsPerPage);
  const setItemsPerPage = useDestinationLibraryStore((s) => s.setItemsPerPage);
  const filters = useDestinationLibraryStore((s) => s.filters);
  const resetFilters = useDestinationLibraryStore((s) => s.resetFilters);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {headerSlot || <h2 className="text-base font-semibold text-[#1A1A1A]">Destinations</h2>}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setLayoutMode(layoutMode === "list-full" ? "split" : "list-full")
            }
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
            title={layoutMode === "list-full" ? "Restore split view" : "Expand"}
          >
            {layoutMode === "list-full" ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setLayoutMode("map-full")}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4">
        <DestinationSearchBar totalCount={totalCount} onCreateNew={onCreateNew} />
        <DestinationFilterBar cities={cities} />
      </div>

      {/* Destination List */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#C75B2A]" />
          </div>
        ) : destinations.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No destinations found"
            description={
              filters.search
                ? `No results for "${filters.search}". Try a different search.`
                : "No destinations match the current filters."
            }
            action={
              filters.search || filters.category || filters.city
                ? { label: "Clear filters", onClick: resetFilters }
                : undefined
            }
            size="sm"
          />
        ) : (
          destinations.map((dest) => (
            <DestinationCard key={dest.id ?? dest.slug} destination={dest} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8E2D9] bg-white/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-7 px-2 text-xs border border-[#E8E2D9] rounded-md bg-white text-[#1A1A1A]"
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <span className="text-[11px] text-[#6B6B6B]">
              Page {page} of {totalPages}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 rounded-md hover:bg-gray-100 text-[#6B6B6B] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-md hover:bg-gray-100 text-[#6B6B6B] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Floating button shown when panel is closed (map-full mode) */
export function ShowDestListButton() {
  const setLayoutMode = useDestinationLibraryStore((s) => s.setLayoutMode);
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);

  if (layoutMode !== "map-full") return null;

  return (
    <button
      onClick={() => setLayoutMode("split")}
      className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-[#E8E2D9] text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
    >
      Show Destinations
    </button>
  );
}
