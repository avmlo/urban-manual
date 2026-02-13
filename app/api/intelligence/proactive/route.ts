import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/errors";
import { opportunityDetectionService } from "@/services/intelligence/opportunity-detection";
import { tasteProfileEvolutionService } from "@/services/intelligence/taste-profile-evolution";

export interface ProactiveCard {
  id: string;
  type:
    | "trip_suggestion"
    | "opportunity"
    | "friend_activity"
    | "trip_nudge"
    | "post_trip";
  title: string;
  description: string;
  icon: "map" | "sparkles" | "users" | "calendar" | "star";
  urgency: "low" | "medium" | "high";
  action?: {
    label: string;
    type: "generate_itinerary" | "view_destination" | "rate_places" | "dismiss";
    payload?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

/**
 * GET /api/intelligence/proactive
 *
 * Orchestrates calls to existing intelligence services to generate
 * contextual proactive cards for logged-in users on the homepage.
 *
 * Returns up to 3 intelligence cards based on:
 * - Saved places without trips (trip suggestion)
 * - Opportunity detection (price drops, events, Michelin matches)
 * - Upcoming trip awareness (nudges within 14 days)
 * - Post-trip prompts (completed trips needing review)
 * - Friend activity on saved places
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ cards: [] });
  }

  const cards: ProactiveCard[] = [];

  // Run all intelligence queries in parallel
  const [
    savedPlacesResult,
    tripsResult,
    opportunitiesResult,
    tasteProfileResult,
    friendActivityResult,
  ] = await Promise.allSettled([
    getSavedPlacesInsights(supabase, user.id),
    getTripInsights(supabase, user.id),
    opportunityDetectionService.detectOpportunities(user.id, undefined, 5),
    tasteProfileEvolutionService.getTasteProfile(user.id),
    getFriendActivity(supabase, user.id),
  ]);

  // 1. Trip suggestion cards — "You saved N places in X but haven't planned a trip"
  if (savedPlacesResult.status === "fulfilled" && savedPlacesResult.value) {
    const { cityCounts, citiesWithTrips } = savedPlacesResult.value;
    for (const [city, count] of Object.entries(cityCounts)) {
      if (count >= 3 && !citiesWithTrips.has(city)) {
        cards.push({
          id: `trip-suggestion-${city}`,
          type: "trip_suggestion",
          title: `${count} saved places in ${city}`,
          description: `You've been saving places in ${city} but haven't planned a trip yet — want me to build one?`,
          icon: "map",
          urgency: count >= 7 ? "high" : "medium",
          action: {
            label: "Build a trip",
            type: "generate_itinerary",
            payload: { city, savedCount: count },
          },
          meta: { city, savedCount: count },
        });
      }
    }
  }

  // 2. Upcoming trip nudges — "Trip in N days, things to address"
  if (tripsResult.status === "fulfilled" && tripsResult.value) {
    const { upcomingTrips, completedTrips } = tripsResult.value;

    for (const trip of upcomingTrips) {
      const daysUntil = Math.ceil(
        (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 14 && daysUntil >= 0) {
        const destination = trip.destination || "your destination";
        cards.push({
          id: `trip-nudge-${trip.id}`,
          type: "trip_nudge",
          title: `${destination} in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          description: buildTripNudgeDescription(trip, daysUntil),
          icon: "calendar",
          urgency: daysUntil <= 3 ? "high" : "medium",
          action: {
            label: "Review trip",
            type: "view_destination",
            payload: { tripId: trip.id, destination },
          },
          meta: { tripId: trip.id, daysUntil, destination },
        });
      }
    }

    // 3. Post-trip prompts — "How was X? Rate the places you visited"
    for (const trip of completedTrips) {
      const daysSince = Math.ceil(
        (Date.now() - new Date(trip.end_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince <= 14 && daysSince >= 0) {
        const destination = trip.destination || "your trip";
        cards.push({
          id: `post-trip-${trip.id}`,
          type: "post_trip",
          title: `How was ${destination}?`,
          description: `Rate the places you visited to sharpen your taste profile and get better recommendations.`,
          icon: "star",
          urgency: daysSince <= 3 ? "medium" : "low",
          action: {
            label: "Rate places",
            type: "rate_places",
            payload: { tripId: trip.id, destination },
          },
          meta: { tripId: trip.id, daysSince, destination },
        });
      }
    }
  }

  // 4. Opportunity cards — Michelin matches, events matching taste profile
  if (opportunitiesResult.status === "fulfilled" && opportunitiesResult.value.length > 0) {
    const tasteProfile =
      tasteProfileResult.status === "fulfilled" ? tasteProfileResult.value : null;

    for (const opp of opportunitiesResult.value.slice(0, 2)) {
      const isTasteMatch =
        tasteProfile?.preferences?.categories?.some(
          (c) => c.weight > 0.5 && opp.city
        ) ?? false;

      cards.push({
        id: `opportunity-${opp.type}-${opp.destinationId}`,
        type: "opportunity",
        title: opp.title,
        description: isTasteMatch
          ? `${opp.description} — matches your taste profile`
          : opp.description,
        icon: "sparkles",
        urgency: opp.urgency,
        action: opp.destinationSlug
          ? {
              label: "View",
              type: "view_destination",
              payload: { slug: opp.destinationSlug, city: opp.city },
            }
          : undefined,
        meta: {
          opportunityType: opp.type,
          destinationId: opp.destinationId,
          destinationSlug: opp.destinationSlug,
        },
      });
    }
  }

  // 5. Friend activity — "Your friend visited places you saved"
  if (friendActivityResult.status === "fulfilled" && friendActivityResult.value.length > 0) {
    for (const activity of friendActivityResult.value.slice(0, 1)) {
      cards.push({
        id: `friend-activity-${activity.user_id}-${activity.destination_slug}`,
        type: "friend_activity",
        title: `${activity.display_name} visited a place you saved`,
        description: `${activity.display_name} just visited ${activity.destination_name} in ${activity.city}`,
        icon: "users",
        urgency: "low",
        action: activity.destination_slug
          ? {
              label: "View",
              type: "view_destination",
              payload: { slug: activity.destination_slug },
            }
          : undefined,
        meta: {
          friendUserId: activity.user_id,
          destinationSlug: activity.destination_slug,
        },
      });
    }
  }

  // Sort by urgency, then take top 3
  const urgencyOrder = { high: 3, medium: 2, low: 1 };
  cards.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

  return NextResponse.json({ cards: cards.slice(0, 3) });
});

// ── Helper Functions ──────────────────────────────────────────────

interface SavedPlacesInsights {
  cityCounts: Record<string, number>;
  citiesWithTrips: Set<string>;
}

async function getSavedPlacesInsights(
  supabase: any,
  userId: string
): Promise<SavedPlacesInsights | null> {
  try {
    // Get saved places with city info
    const { data: savedPlaces } = await supabase
      .from("saved_places")
      .select("destination_slug, destinations(city)")
      .eq("user_id", userId);

    if (!savedPlaces || savedPlaces.length === 0) return null;

    // Count saved places per city
    const cityCounts: Record<string, number> = {};
    for (const sp of savedPlaces) {
      const city = sp.destinations?.city;
      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    }

    // Get cities that already have trips
    const { data: trips } = await supabase
      .from("trips")
      .select("destination")
      .eq("user_id", userId)
      .in("status", ["planning", "upcoming", "ongoing"]);

    const citiesWithTrips = new Set<string>();
    if (trips) {
      for (const trip of trips) {
        if (trip.destination) {
          // destination can be comma-separated
          for (const d of trip.destination.split(",")) {
            citiesWithTrips.add(d.trim());
          }
        }
      }
    }

    return { cityCounts, citiesWithTrips };
  } catch (error) {
    console.error("Error getting saved places insights:", error);
    return null;
  }
}

interface TripRecord {
  id: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface TripInsights {
  upcomingTrips: TripRecord[];
  completedTrips: TripRecord[];
}

async function getTripInsights(
  supabase: any,
  userId: string
): Promise<TripInsights | null> {
  try {
    const now = new Date().toISOString();
    const twoWeeksFromNow = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const twoWeeksAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Get upcoming trips (start date within 14 days)
    const { data: upcomingTrips } = await supabase
      .from("trips")
      .select("id, destination, start_date, end_date, status")
      .eq("user_id", userId)
      .in("status", ["planning", "upcoming"])
      .gte("start_date", now)
      .lte("start_date", twoWeeksFromNow)
      .order("start_date", { ascending: true })
      .limit(3);

    // Get recently completed trips (end date within past 14 days)
    const { data: completedTrips } = await supabase
      .from("trips")
      .select("id, destination, start_date, end_date, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("end_date", twoWeeksAgo)
      .lte("end_date", now)
      .order("end_date", { ascending: false })
      .limit(3);

    return {
      upcomingTrips: upcomingTrips || [],
      completedTrips: completedTrips || [],
    };
  } catch (error) {
    console.error("Error getting trip insights:", error);
    return null;
  }
}

interface FriendActivityRecord {
  user_id: string;
  display_name: string;
  destination_slug: string;
  destination_name: string;
  city: string;
}

async function getFriendActivity(
  supabase: any,
  userId: string
): Promise<FriendActivityRecord[]> {
  try {
    // Get users this person follows
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (!following || following.length === 0) return [];

    const followingIds = following.map((f: any) => f.following_id);

    // Get the current user's saved destinations
    const { data: savedPlaces } = await supabase
      .from("saved_places")
      .select("destination_slug")
      .eq("user_id", userId);

    if (!savedPlaces || savedPlaces.length === 0) return [];

    const savedSlugs = savedPlaces.map((sp: any) => sp.destination_slug);

    // Find friends who visited places the user has saved
    const { data: friendVisits } = await supabase
      .from("visited_places")
      .select(
        "user_id, destination_slug, created_at, user_profiles(display_name), destinations(name, city)"
      )
      .in("user_id", followingIds)
      .in("destination_slug", savedSlugs)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!friendVisits) return [];

    return friendVisits.map((visit: any) => ({
      user_id: visit.user_id,
      display_name: visit.user_profiles?.display_name || "A friend",
      destination_slug: visit.destination_slug,
      destination_name: visit.destinations?.name || visit.destination_slug,
      city: visit.destinations?.city || "",
    }));
  } catch (error) {
    console.error("Error getting friend activity:", error);
    return [];
  }
}

function buildTripNudgeDescription(trip: TripRecord, daysUntil: number): string {
  const parts: string[] = [];

  if (daysUntil <= 3) {
    parts.push("Your trip is coming up soon");
  } else {
    parts.push(`Your trip starts in ${daysUntil} days`);
  }

  parts.push("— review your itinerary and make sure everything is set.");

  return parts.join(" ");
}
