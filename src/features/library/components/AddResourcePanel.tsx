"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { useResourceLibraryStore } from "../lib/resource-store";
import type { Resource, ResourceType } from "../lib/types";
import { cn } from "@/lib/utils";

interface PlaceResult {
  id: string;
  name: string;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  category: string;
  image: string | null;
  website: string | null;
  phone: string | null;
}

function categoryToType(category: string): ResourceType {
  const map: Record<string, ResourceType> = {
    Dining: "restaurant",
    Cafe: "restaurant",
    Bar: "restaurant",
    Hotel: "hotel",
    Culture: "activity",
    Shopping: "activity",
    Other: "activity",
  };
  return map[category] ?? "activity";
}

export function AddResourcePanel() {
  const setPanelView = useResourceLibraryStore((s) => s.setPanelView);
  const addResources = useResourceLibraryStore((s) => s.addResources);
  const existingResources = useResourceLibraryStore((s) => s.resources);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/google-places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (json.data?.places) {
        setResults(json.data.places);
      }
    } catch (err) {
      console.error("Places search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 10) {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const newResources: Resource[] = results
      .filter((r) => selected.has(r.id))
      .filter(
        (r) =>
          !existingResources.some(
            (er) => er.name === r.name && er.address === r.formatted_address
          )
      )
      .map((place) => ({
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: place.name,
        type: categoryToType(place.category),
        description: "",
        address: place.formatted_address,
        phone: place.phone || "",
        website: place.website || "",
        googleMapsUrl: "",
        agentBookingLink: "",
        price: "",
        hours: "",
        partnerType: "",
        urlLink: "",
        tags: [],
        images: place.image ? [place.image] : [],
        affiliates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lat: place.latitude,
        lng: place.longitude,
        hasUnreadUpdate: false,
      }));

    if (newResources.length > 0) {
      addResources(newResources);
    }
    setPanelView("list");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E2D9]">
        <h2 className="text-base font-semibold text-[#1A1A1A]">
          Add Resource ({selected.size}/10)
        </h2>
        <button
          onClick={() => setPanelView("list")}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by business or place name"
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#E8E2D9] bg-white text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#C75B2A]/30"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5">
        {!query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F0EBE0] flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-[#6B6B6B]" />
            </div>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
              New Resources Will Appear Here
            </p>
            <p className="text-xs text-[#6B6B6B] max-w-xs">
              You can add a single resource or multiple resources via the search
              bar above, which will pull in business details from Google Places.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#C75B2A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2 pb-4">
            {results.map((place) => {
              const isSelected = selected.has(place.id);
              return (
                <button
                  key={place.id}
                  onClick={() => toggleSelect(place.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                    isSelected
                      ? "border-[#C75B2A]/40 bg-[#FDF3E3]/50"
                      : "border-[#E8E2D9] hover:border-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      isSelected
                        ? "border-[#C75B2A] bg-[#C75B2A]"
                        : "border-[#E8E2D9]"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {place.name}
                    </p>
                    <p className="text-xs text-[#6B6B6B] truncate">
                      {place.formatted_address}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    {place.category}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {selected.size > 0 && (
        <div className="px-5 py-3 border-t border-[#E8E2D9]">
          <button
            onClick={handleAdd}
            className="w-full h-10 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Add to Library ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}
