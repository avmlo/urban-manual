"use client";

import { Maximize2, Minimize2, X, PanelLeftOpen } from "lucide-react";
import { useResourceLibraryStore, useFilteredResources } from "../lib/resource-store";
import { ResourceCard } from "./ResourceCard";
import { SearchActionBar } from "./SearchActionBar";
import { FilterBar } from "./FilterBar";
import { EmptyState } from "@/ui/empty-state";
import { Search } from "lucide-react";

interface ResourceListPanelProps {
  headerSlot?: React.ReactNode;
}

export function ResourceListPanel({ headerSlot }: ResourceListPanelProps = {}) {
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);
  const setLayoutMode = useResourceLibraryStore((s) => s.setLayoutMode);
  const filtered = useFilteredResources();
  const filters = useResourceLibraryStore((s) => s.filters);
  const resetFilters = useResourceLibraryStore((s) => s.resetFilters);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {headerSlot || <h2 className="text-base font-semibold text-[#1A1A1A]">Resources</h2>}
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
        <SearchActionBar />
        <FilterBar />
      </div>

      {/* Resource List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No resources found"
            description={
              filters.search
                ? `No results for "${filters.search}". Try a different search term.`
                : "No resources match the current filters."
            }
            action={
              filters.search || filters.type || filters.location || filters.keywords.length > 0
                ? { label: "Clear filters", onClick: resetFilters }
                : undefined
            }
            size="sm"
          />
        ) : (
          filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))
        )}
      </div>
    </div>
  );
}

/** Floating button shown when panel is closed (map-full mode) */
export function ShowListButton() {
  const setLayoutMode = useResourceLibraryStore((s) => s.setLayoutMode);
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);

  if (layoutMode !== "map-full") return null;

  return (
    <button
      onClick={() => setLayoutMode("split")}
      className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-[#E8E2D9] text-sm font-medium text-[#1A1A1A] hover:bg-gray-50 transition-colors"
    >
      <PanelLeftOpen className="w-4 h-4" />
      Show Library
    </button>
  );
}
