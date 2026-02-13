import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandling } from "@/lib/errors";
import type { ItineraryItemNotes } from "@/types/trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Pad a number to 2 digits with leading zero
 */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Format a Date as an iCalendar DATE-TIME string (YYYYMMDDTHHMMSS)
 */
function formatDateTime(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Format a Date as an iCalendar DATE string (YYYYMMDD)
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/**
 * Generate a deterministic UID for a VEVENT
 */
function generateUID(tripId: string, itemId: string): string {
  return `${itemId}-${tripId}@urbanmanual.co`;
}

/**
 * Escape special characters in iCalendar text values
 * Per RFC 5545: backslash, semicolon, comma, and newlines must be escaped
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Safely parse notes JSON from an itinerary item
 */
function parseNotes(notes: string | null): ItineraryItemNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

/**
 * Add days to a date (pure, returns a new Date)
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * GET /api/trips/[id]/export/ical
 * Export a trip's itinerary as an iCalendar (.ics) file
 */
export const GET = withErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Trip ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch trip
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (tripError) {
      if (tripError.code === "PGRST116") {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      throw tripError;
    }

    // Fetch itinerary items
    const { data: items, error: itemsError } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .order("day", { ascending: true })
      .order("order_index", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    // Build the iCalendar content
    const now = formatDateTime(new Date());
    const events: string[] = [];

    const tripStartDate = trip.start_date
      ? new Date(trip.start_date + "T00:00:00")
      : null;

    for (const item of items || []) {
      if (!tripStartDate) continue;

      const notes = parseNotes(item.notes);
      const durationMinutes = notes?.duration ?? 60;
      const itemDate = addDays(tripStartDate, item.day - 1);

      // Build description parts
      const descriptionParts: string[] = [];
      if (notes?.type) {
        descriptionParts.push(`Type: ${notes.type}`);
      }
      if (notes?.raw) {
        descriptionParts.push(notes.raw);
      }

      // Build location from notes fields
      const locationParts: string[] = [];
      if (notes?.address) {
        locationParts.push(notes.address);
      }
      if (notes?.city) {
        locationParts.push(notes.city);
      }
      // Fall back to trip destination if no specific location
      if (locationParts.length === 0 && trip.destination) {
        locationParts.push(trip.destination);
      }

      const uid = generateUID(id, item.id);
      const summary = escapeICalText(item.title || "Untitled");

      if (item.time) {
        // Timed event
        const [hours, minutes] = item.time.split(":").map(Number);
        const startDate = new Date(itemDate);
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(
          startDate.getTime() + durationMinutes * 60 * 1000
        );

        const eventLines = [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${now}`,
          `DTSTART:${formatDateTime(startDate)}`,
          `DTEND:${formatDateTime(endDate)}`,
          `SUMMARY:${summary}`,
        ];

        if (locationParts.length > 0) {
          eventLines.push(
            `LOCATION:${escapeICalText(locationParts.join(", "))}`
          );
        }
        if (descriptionParts.length > 0) {
          eventLines.push(
            `DESCRIPTION:${escapeICalText(descriptionParts.join("\n"))}`
          );
        }

        eventLines.push("END:VEVENT");
        events.push(eventLines.join("\r\n"));
      } else {
        // All-day event
        const eventLines = [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${now}`,
          `DTSTART;VALUE=DATE:${formatDate(itemDate)}`,
          `DTEND;VALUE=DATE:${formatDate(addDays(itemDate, 1))}`,
          `SUMMARY:${summary}`,
        ];

        if (locationParts.length > 0) {
          eventLines.push(
            `LOCATION:${escapeICalText(locationParts.join(", "))}`
          );
        }
        if (descriptionParts.length > 0) {
          eventLines.push(
            `DESCRIPTION:${escapeICalText(descriptionParts.join("\n"))}`
          );
        }

        eventLines.push("END:VEVENT");
        events.push(eventLines.join("\r\n"));
      }
    }

    // Assemble the full VCALENDAR
    const calendarLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Urban Manual//Trip Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeICalText(trip.title || "Trip")}`,
      ...events,
      "END:VCALENDAR",
    ];

    const icsContent = calendarLines.join("\r\n") + "\r\n";

    // Sanitize the trip title for the filename
    const safeTitle = (trip.title || "trip")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 50);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.ics"`,
      },
    });
  }
);
