"use client";

import { Pencil, Maximize2, Minimize2, X } from "lucide-react";
import type { Resource } from "../lib/types";
import { useResourceLibraryStore } from "../lib/resource-store";
import { ResourceIcon } from "./ResourceIcon";

interface ResourceDetailHeaderProps {
  resource: Resource;
}

export function ResourceDetailHeader({ resource }: ResourceDetailHeaderProps) {
  const selectResource = useResourceLibraryStore((s) => s.selectResource);
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);
  const setLayoutMode = useResourceLibraryStore((s) => s.setLayoutMode);

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E8E2D9] bg-white sticky top-0 z-10">
      <ResourceIcon type={resource.type} size="md" />

      <h2 className="flex-1 text-xl font-bold text-[#1A1A1A] truncate">
        {resource.name}
      </h2>

      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
          title="Edit resource"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setLayoutMode(layoutMode === "list-full" ? "split" : "list-full")
          }
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
          title="Toggle expand"
        >
          {layoutMode === "list-full" ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => selectResource(null)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
