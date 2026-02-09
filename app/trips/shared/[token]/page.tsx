import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@/lib/supabase/server";
import {
  parseItineraryNotes,
  parseDestinations,
  formatDestinations,
} from "@/types/trip";
import type { ItineraryItem, ItineraryItemNotes, Trip } from "@/types/trip";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedItem extends ItineraryItem {
  parsedNotes: ItineraryItemNotes | null;
  destination: {
    name: string;
    city: string;
    category: string;
    image: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface DayGroup {
  day: number;
  date: string | null;
  items: EnrichedItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const s = new Date(start + "T00:00:00").toLocaleDateString("en-US", opts);
  if (!end || start === end) return s;
  const e = new Date(end + "T00:00:00").toLocaleDateString("en-US", opts);
  return `${s} - ${e}`;
}

function categoryLabel(category: string | undefined | null): string {
  if (!category) return "";
  return category
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getSharedTrip(token: string) {
  const supabase = await createServerClient();

  // Look up trip by share_token (no auth required)
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("share_token", token)
    .single();

  if (tripError || !trip) {
    return null;
  }

  // Fetch itinerary items for the trip
  const { data: items } = await supabase
    .from("itinerary_items")
    .select("*")
    .eq("trip_id", trip.id)
    .order("day", { ascending: true })
    .order("order_index", { ascending: true });

  const itineraryItems: ItineraryItem[] = items || [];

  // Collect destination slugs for enrichment
  const slugs = itineraryItems
    .map((item) => item.destination_slug)
    .filter((s): s is string => Boolean(s));

  let destinationMap: Record<string, EnrichedItem["destination"]> = {};

  if (slugs.length > 0) {
    const { data: destData } = await supabase
      .from("destinations")
      .select("slug, name, city, category, image, latitude, longitude")
      .in("slug", [...new Set(slugs)]);

    if (destData) {
      destinationMap = destData.reduce(
        (
          acc: Record<string, EnrichedItem["destination"]>,
          d: {
            slug: string;
            name: string;
            city: string;
            category: string;
            image: string | null;
            latitude: number | null;
            longitude: number | null;
          }
        ) => {
          acc[d.slug] = {
            name: d.name,
            city: d.city,
            category: d.category,
            image: d.image,
            latitude: d.latitude,
            longitude: d.longitude,
          };
          return acc;
        },
        {} as Record<string, EnrichedItem["destination"]>
      );
    }
  }

  // Enrich items
  const enrichedItems: EnrichedItem[] = itineraryItems.map((item) => ({
    ...item,
    parsedNotes: parseItineraryNotes(item.notes),
    destination: item.destination_slug
      ? destinationMap[item.destination_slug] || null
      : null,
  }));

  // Group by day
  const dayMap = new Map<number, EnrichedItem[]>();
  for (const item of enrichedItems) {
    const group = dayMap.get(item.day) || [];
    group.push(item);
    dayMap.set(item.day, group);
  }

  const days: DayGroup[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, dayItems]) => ({
      day,
      date: trip.start_date ? addDays(trip.start_date, day - 1) : null,
      items: dayItems,
    }));

  return { trip: trip as Trip, days };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedTrip(token);

  if (!data) {
    return { title: "Trip Not Found | Urban Manual" };
  }

  const destinations = formatDestinations(
    parseDestinations(data.trip.destination)
  );
  const title = data.trip.title || `Trip to ${destinations}`;

  return {
    title: `${title} | Urban Manual`,
    description: `View this shared trip itinerary${destinations ? ` to ${destinations}` : ""} on Urban Manual.`,
    openGraph: {
      title: `${title} | Urban Manual`,
      description: `View this shared trip itinerary${destinations ? ` to ${destinations}` : ""} on Urban Manual.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component (Server Component -- no "use client")
// ---------------------------------------------------------------------------

export default async function SharedTripPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getSharedTrip(token);

  if (!data) {
    return notFound();
  }

  const { trip, days } = data;
  const destinations = formatDestinations(parseDestinations(trip.destination));
  const dateRange = formatDateRange(trip.start_date, trip.end_date);
  const tripTitle = trip.title || `Trip to ${destinations}`;

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: "var(--editorial-bg)",
        color: "var(--editorial-text-primary)",
      }}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Header */}
      {/* ----------------------------------------------------------------- */}
      <header
        className="border-b px-4 py-10 sm:px-6 md:px-8"
        style={{ borderColor: "var(--editorial-border)" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {tripTitle}
          </h1>

          {destinations && (
            <p
              className="mt-2 text-lg"
              style={{ color: "var(--editorial-text-secondary)" }}
            >
              {destinations}
            </p>
          )}

          {dateRange && (
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--editorial-text-tertiary)" }}
            >
              {dateRange}
            </p>
          )}
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Itinerary */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:px-8">
        {days.length === 0 ? (
          <p
            className="text-center text-sm"
            style={{ color: "var(--editorial-text-tertiary)" }}
          >
            No itinerary items have been added to this trip yet.
          </p>
        ) : (
          <div className="space-y-10">
            {days.map((dayGroup) => (
              <div key={dayGroup.day}>
                {/* Day heading */}
                <div
                  className="mb-4 border-b pb-2"
                  style={{ borderColor: "var(--editorial-border)" }}
                >
                  <h2 className="text-lg font-semibold">
                    Day {dayGroup.day}
                  </h2>
                  {dayGroup.date && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--editorial-text-tertiary)" }}
                    >
                      {dayGroup.date}
                    </p>
                  )}
                </div>

                {/* Items */}
                <ul className="space-y-4">
                  {dayGroup.items.map((item) => (
                    <SharedItineraryItem key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Map placeholder */}
      {/* ----------------------------------------------------------------- */}
      {days.length > 0 && (
        <section
          className="border-t px-4 py-10 sm:px-6 md:px-8"
          style={{ borderColor: "var(--editorial-border)" }}
        >
          <div className="mx-auto max-w-3xl">
            <div
              className="flex h-64 items-center justify-center rounded-lg border"
              style={{
                borderColor: "var(--editorial-border)",
                backgroundColor: "var(--editorial-bg)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--editorial-text-tertiary)" }}
              >
                Map view available in the full trip editor
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Footer */}
      {/* ----------------------------------------------------------------- */}
      <footer
        className="border-t px-4 py-8 sm:px-6 md:px-8"
        style={{ borderColor: "var(--editorial-border)" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="text-sm"
            style={{ color: "var(--editorial-text-tertiary)" }}
          >
            Planned with{" "}
            <Link
              href="/"
              className="underline underline-offset-2 transition-colors hover:opacity-80"
              style={{ color: "var(--editorial-accent)" }}
            >
              Urban Manual
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single itinerary item
// ---------------------------------------------------------------------------

function SharedItineraryItem({ item }: { item: EnrichedItem }) {
  const notes = item.parsedNotes;
  const dest = item.destination;

  const displayCategory =
    categoryLabel(notes?.category) ||
    categoryLabel(dest?.category) ||
    categoryLabel(notes?.type);
  const displayImage = notes?.image || dest?.image;
  const displayTime = item.time || notes?.departureTime;

  return (
    <li
      className="flex gap-4 rounded-lg border p-4"
      style={{ borderColor: "var(--editorial-border)" }}
    >
      {/* Thumbnail */}
      {displayImage && (
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          <Image
            src={displayImage}
            alt={item.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-snug">{item.title}</h3>

          {displayTime && (
            <span
              className="flex-shrink-0 text-xs tabular-nums"
              style={{ color: "var(--editorial-text-tertiary)" }}
            >
              {displayTime}
            </span>
          )}
        </div>

        {displayCategory && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--editorial-text-secondary)" }}
          >
            {displayCategory}
          </p>
        )}

        {dest?.city && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--editorial-text-tertiary)" }}
          >
            {dest.city}
          </p>
        )}
      </div>
    </li>
  );
}
