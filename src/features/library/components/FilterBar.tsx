"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useResourceLibraryStore } from "../lib/resource-store";
import type { ResourceType } from "../lib/types";
import { cn } from "@/lib/utils";

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "partner", label: "Partner" },
  { value: "guide", label: "Guide" },
  { value: "list", label: "List" },
];

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
        active
          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
          : "bg-white text-[#1A1A1A] border-[#E8E2D9] hover:border-[#1A1A1A]/30"
      )}
    >
      {label}
      <ChevronDown className="w-3 h-3" />
    </button>
  );
}

export function FilterBar() {
  const resources = useResourceLibraryStore((s) => s.resources);
  const filters = useResourceLibraryStore((s) => s.filters);
  const setFilters = useResourceLibraryStore((s) => s.setFilters);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Derive unique locations (cities extracted from addresses)
  const locations = Array.from(
    new Set(
      resources
        .map((r) => {
          const parts = r.address.split(",");
          return parts.length >= 2 ? parts[parts.length - 2].trim() : "";
        })
        .filter(Boolean)
    )
  );

  // Derive unique tags
  const allTags = Array.from(
    new Set(resources.flatMap((r) => r.tags).filter(Boolean))
  );

  // Derive unique affiliates
  const allAffiliates = Array.from(
    new Set(resources.flatMap((r) => r.affiliates).filter(Boolean))
  );

  const toggleFilter = (name: string) => {
    setOpenFilter(openFilter === name ? null : name);
  };

  return (
    <div className="flex items-center gap-2 mb-4 relative">
      {/* Location Filter */}
      <div className="relative">
        <FilterPill
          label="Location"
          active={!!filters.location}
          onClick={() => toggleFilter("location")}
        />
        {openFilter === "location" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => {
                setFilters({ location: null });
                setOpenFilter(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                !filters.location && "font-medium"
              )}
            >
              All Locations
              {!filters.location && <Check className="w-3 h-3 ml-auto" />}
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setFilters({ location: loc });
                  setOpenFilter(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                  filters.location === loc && "font-medium"
                )}
              >
                {loc}
                {filters.location === loc && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type Filter */}
      <div className="relative">
        <FilterPill
          label="Type"
          active={!!filters.type}
          onClick={() => toggleFilter("type")}
        />
        {openFilter === "type" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[160px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => {
                setFilters({ type: null });
                setOpenFilter(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                !filters.type && "font-medium"
              )}
            >
              All Types
              {!filters.type && <Check className="w-3 h-3 ml-auto" />}
            </button>
            {RESOURCE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setFilters({ type: t.value });
                  setOpenFilter(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                  filters.type === t.value && "font-medium"
                )}
              >
                {t.label}
                {filters.type === t.value && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keywords Filter */}
      <div className="relative">
        <FilterPill
          label="Keywords"
          active={filters.keywords.length > 0}
          onClick={() => toggleFilter("keywords")}
        />
        {openFilter === "keywords" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => {
                setFilters({ keywords: [] });
                setOpenFilter(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                filters.keywords.length === 0 && "font-medium"
              )}
            >
              All Keywords
              {filters.keywords.length === 0 && (
                <Check className="w-3 h-3 ml-auto" />
              )}
            </button>
            {allTags.map((tag) => {
              const isActive = filters.keywords.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    const next = isActive
                      ? filters.keywords.filter((k) => k !== tag)
                      : [...filters.keywords, tag];
                    setFilters({ keywords: next });
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                    isActive && "font-medium"
                  )}
                >
                  {tag}
                  {isActive && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Affiliates Filter */}
      <div className="relative">
        <FilterPill
          label="Affiliates"
          active={!!filters.affiliates}
          onClick={() => toggleFilter("affiliates")}
        />
        {openFilter === "affiliates" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[200px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => {
                setFilters({ affiliates: null });
                setOpenFilter(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                !filters.affiliates && "font-medium"
              )}
            >
              All Affiliates
              {!filters.affiliates && <Check className="w-3 h-3 ml-auto" />}
            </button>
            {allAffiliates.map((aff) => (
              <button
                key={aff}
                onClick={() => {
                  setFilters({ affiliates: aff });
                  setOpenFilter(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors",
                  filters.affiliates === aff && "font-medium"
                )}
              >
                {aff}
                {filters.affiliates === aff && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {openFilter && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenFilter(null)}
        />
      )}
    </div>
  );
}
