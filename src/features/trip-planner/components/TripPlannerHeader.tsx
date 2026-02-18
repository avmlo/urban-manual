"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Globe, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/src/ui/button";
import { useTripPlanner } from "../context";
import { toast } from "@/lib/toast";

export function TripPlannerHeader() {
  const router = useRouter();
  const { state, saveDraft, supabaseTripId, isSyncing } = useTripPlanner();

  const handleSaveDraft = () => {
    saveDraft();
    toast.success("Draft saved");
  };

  const handlePublish = () => {
    if (!state.trip.title) {
      toast.error("Please add a trip title before publishing");
      return;
    }
    if (!state.trip.location) {
      toast.error("Please add a trip location before publishing");
      return;
    }
    // Save first, then navigate to the trip view
    saveDraft();
    toast.success("Trip published!");
    if (supabaseTripId) {
      router.push(`/trips/${supabaseTripId}`);
    }
  };

  const lastSavedText = state.ui.lastSaved
    ? `Saved ${new Date(state.ui.lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : state.ui.isDirty
      ? "Unsaved changes"
      : "";

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <Link
              href="/trips"
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Back to trips"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                Trip Planner
              </h1>
              <div className="flex items-center gap-1.5">
                {isSyncing && (
                  <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                )}
                {!isSyncing && supabaseTripId && (
                  <Cloud className="w-3 h-3 text-green-500" />
                )}
                {lastSavedText && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {lastSavedText}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button size="sm" onClick={handlePublish}>
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Publish Trip</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
