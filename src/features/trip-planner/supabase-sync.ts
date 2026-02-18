/**
 * Supabase sync for the trip planner.
 *
 * Maps the local planner state to/from the existing `trips` and
 * `itinerary_items` tables.
 *
 * Planner-specific data (travelers, transportation, lodging, expenses)
 * is stored in the trip's `notes` field as JSON alongside existing TripNotes.
 */
import { createClient } from "@/lib/supabase/client";
import type {
  TripPlannerState,
  PlannerActivity,
  PlannerTraveler,
  PlannerTransport,
  PlannerLodging,
  PlannerExpense,
} from "./types";
import { createDefaultState } from "./constants";

/** Shape of the planner-specific data stored in trips.notes */
interface PlannerNotesPayload {
  _plannerData: true; // marker to distinguish from plain TripNotes
  travelers: PlannerTraveler[];
  transportation: PlannerTransport[];
  lodging: PlannerLodging[];
  expenses: PlannerExpense[];
  tripDescription: string;
  tripCurrency: string;
  coverImage: string;
}

function buildPlannerNotes(state: TripPlannerState): string {
  const payload: PlannerNotesPayload = {
    _plannerData: true,
    travelers: state.travelers,
    transportation: state.transportation,
    lodging: state.lodging,
    expenses: state.expenses,
    tripDescription: state.trip.description,
    tripCurrency: state.trip.currency,
    coverImage: state.trip.coverImage,
  };
  return JSON.stringify(payload);
}

function parsePlannerNotes(notes: string | null): PlannerNotesPayload | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed._plannerData) {
      return parsed as PlannerNotesPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save the planner state to Supabase.
 * Creates a new trip if no supabaseTripId is set yet, otherwise updates.
 * Returns the trip ID (useful for first save).
 */
export async function syncToSupabase(
  state: TripPlannerState,
  userId: string,
  supabaseTripId: string | null
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const tripRow = {
    user_id: userId,
    title: state.trip.title || "Untitled Trip",
    description: state.trip.description || null,
    destination: state.trip.location || null,
    start_date: state.trip.startDate || null,
    end_date: state.trip.endDate || null,
    status: "planning" as const,
    cover_image: state.trip.coverImage || null,
    notes: buildPlannerNotes(state),
  };

  let tripId = supabaseTripId;

  if (tripId) {
    // Update existing trip
    const { error } = await supabase
      .from("trips")
      .update({
        title: tripRow.title,
        description: tripRow.description,
        destination: tripRow.destination,
        start_date: tripRow.start_date,
        end_date: tripRow.end_date,
        cover_image: tripRow.cover_image,
        notes: tripRow.notes,
      })
      .eq("id", tripId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update trip:", error);
      return tripId;
    }
  } else {
    // Create new trip
    const { data, error } = await supabase
      .from("trips")
      .insert(tripRow)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to create trip:", error);
      return null;
    }
    tripId = data.id;
  }

  // Sync itinerary items
  if (tripId) {
    await syncItineraryItems(supabase, tripId, state.activities);
  }

  return tripId;
}

async function syncItineraryItems(
  supabase: ReturnType<typeof createClient>,
  tripId: string,
  activities: PlannerActivity[]
) {
  if (!supabase) return;

  // Delete existing items for this trip
  await supabase.from("itinerary_items").delete().eq("trip_id", tripId);

  if (activities.length === 0) return;

  // Insert all current activities
  const rows = activities.map((a) => ({
    trip_id: tripId,
    day: a.dayIndex + 1, // DB uses 1-based day numbers
    order_index: a.orderIndex,
    time: a.time || null,
    title: a.title,
    notes: JSON.stringify({
      type: "custom",
      category: a.category,
      raw: a.description,
      location: a.location,
    }),
  }));

  const { error } = await supabase.from("itinerary_items").insert(rows);
  if (error) {
    console.error("Failed to sync itinerary items:", error);
  }
}

/**
 * Load a trip from Supabase and convert to planner state.
 */
export async function loadFromSupabase(
  tripId: string,
  userId: string
): Promise<TripPlannerState | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // Fetch trip
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", userId)
    .single();

  if (tripError || !trip) return null;

  // Fetch itinerary items
  const { data: items } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day", { ascending: true })
    .order("order_index", { ascending: true });

  // Parse planner notes
  const plannerData = parsePlannerNotes(trip.notes);

  // Build state
  const state = createDefaultState();
  state.trip = {
    id: trip.id,
    title: trip.title || "",
    location: trip.destination || "",
    description: plannerData?.tripDescription ?? trip.description ?? "",
    startDate: trip.start_date || state.trip.startDate,
    endDate: trip.end_date || state.trip.endDate,
    coverImage: plannerData?.coverImage ?? trip.cover_image ?? "",
    currency: plannerData?.tripCurrency ?? "USD",
    createdAt: trip.created_at,
    updatedAt: trip.updated_at,
  };

  // Map itinerary items to planner activities
  state.activities = (items || []).map((item) => {
    let category: PlannerActivity["category"] = "other";
    let description = "";
    let location = "";
    try {
      const parsed = JSON.parse(item.notes || "{}");
      category = parsed.category || "other";
      description = parsed.raw || "";
      location = parsed.location || "";
    } catch {
      // Use defaults
    }
    return {
      id: item.id,
      dayIndex: (item.day || 1) - 1, // Convert 1-based to 0-based
      orderIndex: item.order_index || 0,
      title: item.title || "",
      time: item.time || "",
      category,
      description,
      location,
    };
  });

  // Restore planner-specific data
  if (plannerData) {
    state.travelers = plannerData.travelers || [];
    state.transportation = plannerData.transportation || [];
    state.lodging = plannerData.lodging || [];
    state.expenses = plannerData.expenses || [];
  }

  state.ui.isDirty = false;
  state.ui.lastSaved = trip.updated_at;

  return state;
}
