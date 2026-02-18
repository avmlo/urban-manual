"use client";

import { useState } from "react";
import { MapPin, Calendar, Settings2 } from "lucide-react";
import { Button } from "@/src/ui/button";
import { Progress } from "@/src/ui/progress";
import { useTripPlanner } from "../context";
import { calculateCompletion, formatDateRange } from "../constants";
import { InlineEdit } from "./InlineEdit";
import { TripDetailsModal } from "./TripDetailsModal";

export function TripPlannerHero() {
  const { state, dispatch } = useTripPlanner();
  const [showDetails, setShowDetails] = useState(false);
  const completion = calculateCompletion(state);

  const hasCover = !!state.trip.coverImage;

  return (
    <>
      <section
        className="relative rounded-xl overflow-hidden"
        style={
          hasCover
            ? { backgroundImage: `url(${state.trip.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {/* Overlay */}
        <div
          className={
            hasCover
              ? "absolute inset-0 bg-black/50"
              : "absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700"
          }
        />

        {/* Content */}
        <div className="relative z-10 px-6 py-12 sm:py-16 text-center text-white">
          <InlineEdit
            value={state.trip.title}
            onSave={(v) => dispatch({ type: "UPDATE_TRIP", payload: { title: v } })}
            placeholder="Enter Trip Title"
            as="h1"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white justify-center"
            inputClassName="text-3xl font-bold text-center text-white bg-white/10 border-white/30 placeholder:text-white/50 max-w-md mx-auto"
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-white/90">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <InlineEdit
                value={state.trip.location}
                onSave={(v) => dispatch({ type: "UPDATE_TRIP", payload: { location: v } })}
                placeholder="City, Country"
                className="text-sm text-white/90"
                inputClassName="text-sm text-white bg-white/10 border-white/30 placeholder:text-white/50 w-48"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {formatDateRange(state.trip.startDate, state.trip.endDate)}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <Settings2 className="w-4 h-4" />
              Edit Trip Details
            </Button>
          </div>

          {/* Completion bar */}
          <div className="mt-8 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
              <span>Trip completion</span>
              <span>{completion}%</span>
            </div>
            <Progress value={completion} className="h-2 bg-white/20 [&>div]:bg-white" />
          </div>
        </div>
      </section>

      <TripDetailsModal open={showDetails} onClose={() => setShowDetails(false)} />
    </>
  );
}
