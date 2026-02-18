"use client";

import { Search, Plus, ChevronRight } from "lucide-react";
import { useResourceLibraryStore, useFilteredResources } from "../lib/resource-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/ui/dropdown-menu";
import type { PanelView } from "../lib/types";

const ADD_OPTIONS: { label: string; view: PanelView }[] = [
  { label: "Add Resource", view: "add-resource" },
  { label: "Add Guide", view: "add-guide" },
  { label: "Add Partner", view: "add-partner" },
  { label: "Add List", view: "add-list" },
];

export function SearchActionBar() {
  const filters = useResourceLibraryStore((s) => s.filters);
  const setFilters = useResourceLibraryStore((s) => s.setFilters);
  const setPanelView = useResourceLibraryStore((s) => s.setPanelView);
  const filtered = useFilteredResources();

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search by Resource Title"
          className="w-full h-10 pl-10 pr-32 rounded-full border border-[#E8E2D9] bg-white text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30 focus:border-[#C75B2A]/50 transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-0.5 text-xs font-medium text-[#C75B2A] bg-white border border-[#E8E2D9] rounded-full whitespace-nowrap">
          {filtered.length} Resource{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Add New Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {ADD_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.view}
              onClick={() => setPanelView(option.view)}
              className="flex items-center justify-between cursor-pointer"
            >
              {option.label}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
