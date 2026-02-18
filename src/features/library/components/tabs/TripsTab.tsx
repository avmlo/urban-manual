"use client";

import { Plane } from "lucide-react";
import { useSelectedResource } from "../../lib/resource-store";

export function TripsTab() {
  const resource = useSelectedResource();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-[#F0EBE0] flex items-center justify-center mb-4">
        <Plane className="w-6 h-6 text-[#6B6B6B]" />
      </div>
      <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
        {resource?.name}&apos;s Trip
      </p>
      <p className="text-xs text-[#6B6B6B] max-w-xs">
        There are no trips associated with {resource?.name} yet.
      </p>
    </div>
  );
}
