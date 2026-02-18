"use client";

import { useSelectedResource, useResourceLibraryStore } from "../lib/resource-store";
import { ResourceDetailHeader } from "./ResourceDetailHeader";
import { DetailsTab } from "./tabs/DetailsTab";
import { NotesTab } from "./tabs/NotesTab";
import { TripsTab } from "./tabs/TripsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "details", label: "Details" },
  { id: "notes", label: "Notes" },
  { id: "trips", label: "Trips" },
  { id: "documents", label: "Documents" },
] as const;

export function ResourceDetailPanel() {
  const resource = useSelectedResource();
  const activeTab = useResourceLibraryStore((s) => s.activeDetailTab);
  const setActiveTab = useResourceLibraryStore((s) => s.setActiveDetailTab);

  if (!resource) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      <ResourceDetailHeader resource={resource} />

      {/* Hero Image */}
      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
        {resource.images.length > 0 ? (
          <img
            src={resource.images[0]}
            alt={resource.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-gray-200/80 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-gray-400"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 16l5-4 3 2 4-5 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">No image uploaded</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8E2D9] px-5 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-[#1A1A1A]"
                : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1A1A]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "details" && <DetailsTab resource={resource} />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "trips" && <TripsTab />}
        {activeTab === "documents" && <DocumentsTab />}
      </div>
    </div>
  );
}
