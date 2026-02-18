"use client";

import { useCallback } from "react";
import { TripPlannerProvider } from "@/src/features/trip-planner/context";
import { TripPlannerHeader } from "@/src/features/trip-planner/components/TripPlannerHeader";
import { TripPlannerHero } from "@/src/features/trip-planner/components/TripPlannerHero";
import { ModuleNavCards } from "@/src/features/trip-planner/components/ModuleNavCards";
import { ItinerarySection } from "@/src/features/trip-planner/components/itinerary/ItinerarySection";
import { TravelersSection } from "@/src/features/trip-planner/components/travelers/TravelersSection";
import { TransportationSection } from "@/src/features/trip-planner/components/transportation/TransportationSection";
import { LodgingSection } from "@/src/features/trip-planner/components/lodging/LodgingSection";
import { PricingSection } from "@/src/features/trip-planner/components/pricing/PricingSection";
import type { SectionId } from "@/src/features/trip-planner/types";

interface TripPlannerClientProps {
  userId?: string;
  tripId?: string;
}

function TripPlannerContent() {
  const handleNavigate = useCallback((section: SectionId) => {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--editorial-bg)] dark:bg-gray-950">
      <TripPlannerHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        <TripPlannerHero />
        <ModuleNavCards onNavigate={handleNavigate} />

        <div className="space-y-12">
          <ItinerarySection />
          <TravelersSection />
          <TransportationSection />
          <LodgingSection />
          <PricingSection />
        </div>
      </main>
    </div>
  );
}

export default function TripPlannerClient({
  userId,
  tripId,
}: TripPlannerClientProps) {
  return (
    <TripPlannerProvider userId={userId} tripId={tripId}>
      <TripPlannerContent />
    </TripPlannerProvider>
  );
}
