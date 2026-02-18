"use client";

import { useRef, useEffect } from "react";
import {
  UtensilsCrossed,
  Bed,
  Wine,
  Coffee,
  Landmark,
  ShoppingBag,
  Ticket,
  ChevronRight,
  Star,
  Crown,
} from "lucide-react";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Restaurant: UtensilsCrossed,
  Dining: UtensilsCrossed,
  Hotel: Bed,
  Bar: Wine,
  Cafe: Coffee,
  Culture: Landmark,
  Shopping: ShoppingBag,
};

function getCompleteness(dest: Destination): number {
  const fields: { key: keyof Destination; weight: number }[] = [
    { key: "image", weight: 20 },
    { key: "description", weight: 15 },
    { key: "micro_description", weight: 10 },
    { key: "content", weight: 10 },
    { key: "neighborhood", weight: 5 },
    { key: "country", weight: 5 },
    { key: "formatted_address", weight: 5 },
    { key: "latitude", weight: 5 },
    { key: "website", weight: 5 },
    { key: "phone_number", weight: 5 },
    { key: "rating", weight: 5 },
    { key: "tags", weight: 5 },
    { key: "last_enriched_at", weight: 5 },
  ];
  let score = 0;
  for (const { key, weight } of fields) {
    const val = dest[key];
    if (val !== null && val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0)) {
      score += weight;
    }
  }
  return score;
}

export function DestinationCard({ destination }: { destination: Destination }) {
  const ref = useRef<HTMLButtonElement>(null);
  const selectedSlug = useDestinationLibraryStore((s) => s.selectedDestinationSlug);
  const selectDestination = useDestinationLibraryStore((s) => s.selectDestination);
  const isSelected = selectedSlug === destination.slug;

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const Icon = CATEGORY_ICONS[destination.category || ""] ?? Ticket;
  const completeness = getCompleteness(destination);

  return (
    <button
      ref={ref}
      onClick={() => selectDestination(destination.slug)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg bg-white transition-all text-left",
        "hover:shadow-md border border-transparent",
        isSelected
          ? "border-[#C75B2A]/30 shadow-md ring-1 ring-[#C75B2A]/20"
          : "hover:border-[#E8E2D9]"
      )}
    >
      {/* Category Icon */}
      <div className="relative flex-shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#C75B2A]">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {/* Completeness ring indicator */}
        {completeness < 50 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">
            {destination.name}
          </p>
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 fill-amber-500" />
          )}
          {destination.crown && (
            <Crown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          )}
        </div>
        <p className="text-[13px] text-[#6B6B6B] truncate">
          {[destination.city, destination.country].filter(Boolean).join(", ") ||
            destination.formatted_address ||
            "No location set"}
        </p>
      </div>

      {/* Right side: category badge + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {destination.category && (
          <span className="text-[11px] text-[#6B6B6B] bg-[#F0EBE0] px-2 py-0.5 rounded-full">
            {destination.category}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
      </div>
    </button>
  );
}
