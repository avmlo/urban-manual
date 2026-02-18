"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useDestinationLibraryStore } from "./destination-store";
import type { SortField, SortOrder } from "./destination-store";
import { cn } from "@/lib/utils";
import { VALID_CATEGORIES } from "@/lib/categories";

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
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
      {active ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );
}

interface DestinationFilterBarProps {
  cities: string[];
}

export function DestinationFilterBar({ cities }: DestinationFilterBarProps) {
  const filters = useDestinationLibraryStore((s) => s.filters);
  const setFilters = useDestinationLibraryStore((s) => s.setFilters);
  const resetFilters = useDestinationLibraryStore((s) => s.resetFilters);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 20);
    return cities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 20);
  }, [cities, citySearch]);

  const hasActiveFilters =
    filters.category || filters.city || filters.enriched !== "all" ||
    filters.crownOnly || filters.michelinOnly || filters.missingData !== "all";

  const SORT_OPTIONS: { value: string; label: string; field: SortField; order: SortOrder }[] = [
    { value: "name-asc", label: "Name A-Z", field: "name", order: "asc" },
    { value: "name-desc", label: "Name Z-A", field: "name", order: "desc" },
    { value: "city-asc", label: "City A-Z", field: "city", order: "asc" },
    { value: "updated_at-desc", label: "Recently Updated", field: "updated_at", order: "desc" },
    { value: "created_at-desc", label: "Recently Added", field: "created_at", order: "desc" },
  ];

  const toggleFilter = (name: string) => {
    setOpenFilter(openFilter === name ? null : name);
    setCitySearch("");
  };

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap relative">
      {/* Category */}
      <div className="relative">
        <FilterPill
          label={filters.category || "Category"}
          active={!!filters.category}
          onClick={() => {
            if (filters.category) {
              setFilters({ category: "" });
            } else {
              toggleFilter("category");
            }
          }}
        />
        {openFilter === "category" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] max-h-[280px] overflow-y-auto bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            {VALID_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setFilters({ category: cat });
                  setOpenFilter(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors"
              >
                {cat}
                {filters.category === cat && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City */}
      <div className="relative">
        <FilterPill
          label={filters.city || "City"}
          active={!!filters.city}
          onClick={() => {
            if (filters.city) {
              setFilters({ city: "" });
            } else {
              toggleFilter("city");
            }
          }}
        />
        {openFilter === "city" && (
          <div className="absolute top-full left-0 mt-1 z-30 w-[220px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <input
              autoFocus
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="Search cities..."
              className="w-full h-8 px-2.5 mb-1 text-xs border border-[#E8E2D9] rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#C75B2A]/40"
            />
            <div className="max-h-[200px] overflow-y-auto">
              {filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setFilters({ city });
                    setOpenFilter(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50 transition-colors"
                >
                  {city}
                  {filters.city === city && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="relative">
        <FilterPill
          label={
            filters.enriched !== "all"
              ? filters.enriched === "enriched" ? "Enriched" : "Not Enriched"
              : filters.crownOnly
                ? "Crown"
                : filters.michelinOnly
                  ? "Michelin"
                  : "Status"
          }
          active={filters.enriched !== "all" || filters.crownOnly || filters.michelinOnly}
          onClick={() => {
            if (filters.enriched !== "all" || filters.crownOnly || filters.michelinOnly) {
              setFilters({ enriched: "all", crownOnly: false, michelinOnly: false });
            } else {
              toggleFilter("status");
            }
          }}
        />
        {openFilter === "status" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => { setFilters({ enriched: "enriched" }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Enriched only
            </button>
            <button
              onClick={() => { setFilters({ enriched: "not_enriched" }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Not enriched
            </button>
            <button
              onClick={() => { setFilters({ crownOnly: true }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Crown only
            </button>
            <button
              onClick={() => { setFilters({ michelinOnly: true }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Michelin only
            </button>
          </div>
        )}
      </div>

      {/* Missing Data */}
      <div className="relative">
        <FilterPill
          label={
            filters.missingData === "no_image"
              ? "No Image"
              : filters.missingData === "no_description"
                ? "No Description"
                : filters.missingData === "no_content"
                  ? "No Content"
                  : "Missing Data"
          }
          active={filters.missingData !== "all"}
          onClick={() => {
            if (filters.missingData !== "all") {
              setFilters({ missingData: "all" });
            } else {
              toggleFilter("missing");
            }
          }}
        />
        {openFilter === "missing" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            <button
              onClick={() => { setFilters({ missingData: "no_image" }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Missing image
            </button>
            <button
              onClick={() => { setFilters({ missingData: "no_description" }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Missing description
            </button>
            <button
              onClick={() => { setFilters({ missingData: "no_content" }); setOpenFilter(null); }}
              className="w-full flex items-center px-3 py-1.5 text-xs rounded-md hover:bg-gray-50"
            >
              Missing content
            </button>
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="relative">
        <FilterPill
          label={SORT_OPTIONS.find((o) => o.field === filters.sort && o.order === filters.order)?.label || "Sort"}
          active={filters.sort !== "name" || filters.order !== "asc"}
          onClick={() => {
            if (filters.sort !== "name" || filters.order !== "asc") {
              setFilters({ sort: "name", order: "asc" });
            } else {
              toggleFilter("sort");
            }
          }}
        />
        {openFilter === "sort" && (
          <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] bg-white border border-[#E8E2D9] rounded-lg shadow-lg p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setFilters({ sort: opt.field, order: opt.order });
                  setOpenFilter(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-50",
                  filters.sort === opt.field && filters.order === opt.order && "font-medium"
                )}
              >
                {opt.label}
                {filters.sort === opt.field && filters.order === opt.order && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[#C75B2A] hover:underline"
        >
          Clear all
        </button>
      )}

      {/* Click outside to close */}
      {openFilter && (
        <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
      )}
    </div>
  );
}
