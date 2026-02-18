import { Suspense } from "react";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { PageLoader } from "@/components/LoadingStates";
import TripPlannerClient from "./page-client";

export const metadata: Metadata = {
  title: "Plan a Trip | Urban Manual",
  description:
    "Plan your perfect trip with Urban Manual's trip planner. Manage your itinerary, travelers, transportation, lodging, and budget all in one place.",
};

export default async function TripPlannerPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense fallback={<PageLoader />}>
      <TripPlannerClient userId={user?.id} />
    </Suspense>
  );
}
