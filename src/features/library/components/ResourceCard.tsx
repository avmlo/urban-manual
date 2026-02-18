"use client";

import { useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import type { Resource } from "../lib/types";
import { useResourceLibraryStore } from "../lib/resource-store";
import { ResourceIcon } from "./ResourceIcon";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const selectedId = useResourceLibraryStore((s) => s.selectedResourceId);
  const selectResource = useResourceLibraryStore((s) => s.selectResource);
  const isSelected = selectedId === resource.id;

  // Scroll into view when selected via map pin click
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <button
      ref={ref}
      onClick={() => selectResource(resource.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg bg-white transition-all text-left",
        "hover:shadow-md border border-transparent",
        isSelected
          ? "border-[#C75B2A]/30 shadow-md ring-1 ring-[#C75B2A]/20"
          : "hover:border-[#E8E2D9]"
      )}
    >
      <ResourceIcon
        type={resource.type}
        hasUnreadUpdate={resource.hasUnreadUpdate}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">
          {resource.name}
        </p>
        <p className="text-[13px] text-[#6B6B6B] truncate">{resource.address}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-[#6B6B6B] flex-shrink-0" />
    </button>
  );
}
