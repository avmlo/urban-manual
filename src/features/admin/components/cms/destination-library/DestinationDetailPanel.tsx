"use client";

import { ChevronLeft, X, Maximize2, Minimize2, Check, Loader2, Cloud } from "lucide-react";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { DestinationForm } from "../../DestinationForm";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Toast {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  safeError?: (e: unknown, msg?: string) => void;
}

interface DestinationDetailPanelProps {
  destination: Destination;
  toast: Toast;
  onSave: (data: Partial<Destination>) => Promise<void>;
  onFormChange?: (data: Partial<Destination>) => void;
  isSaving: boolean;
  saveState: SaveState;
}

export function DestinationDetailPanel({
  destination,
  toast,
  onSave,
  onFormChange,
  isSaving,
  saveState,
}: DestinationDetailPanelProps) {
  const closeDetail = useDestinationLibraryStore((s) => s.closeDetail);
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);
  const setLayoutMode = useDestinationLibraryStore((s) => s.setLayoutMode);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E2D9] bg-white sticky top-0 z-10 flex-shrink-0">
        <button
          onClick={closeDetail}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="flex-1 text-base font-semibold text-[#1A1A1A] truncate">
          {destination.name || "Edit Destination"}
        </h2>

        {/* Save state indicator */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {saveState === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              <span className="text-gray-400">Saving…</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-600">Saved</span>
            </>
          )}
          {saveState === "error" && (
            <span className="text-red-500">Save failed</span>
          )}
          {saveState === "idle" && (
            <>
              <Cloud className="w-3 h-3 text-gray-300" />
              <span className="text-gray-300">⌘S</span>
            </>
          )}
        </div>

        <button
          onClick={() =>
            setLayoutMode(layoutMode === "list-full" ? "split" : "list-full")
          }
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          {layoutMode === "list-full" ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={closeDetail}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-[#6B6B6B]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-hidden">
        <DestinationForm
          destination={destination}
          toast={toast}
          onSave={onSave}
          onCancel={closeDetail}
          isSaving={isSaving}
          onFormChange={onFormChange}
        />
      </div>
    </div>
  );
}
