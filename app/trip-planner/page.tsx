import type { Metadata } from "next";
import TripPlannerClient from "./page-client";

export const metadata: Metadata = {
  title: "Trip Planner | Urban Manual",
  description:
    "Plan your perfect trip with Urban Manual's self-build trip planner. Manage your itinerary, travelers, transportation, lodging, and budget all in one place.",
};

export default function TripPlannerPage() {
  return <TripPlannerClient />;
}
