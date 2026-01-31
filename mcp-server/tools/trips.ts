/**
 * Trip Planning Tools
 *
 * Comprehensive trip planning capabilities including:
 * - Trip CRUD operations
 * - Itinerary generation
 * - Day planning
 * - Schedule optimization
 * - Travel time estimation
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";
import { sanitizeForIlike } from "../utils/sanitize.js";

export const tripTools: Tool[] = [
  {
    name: "trip_create",
    description: "Create a new trip with destinations and dates.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID creating the trip",
        },
        title: {
          type: "string",
          description: "Trip title (e.g., 'Tokyo Adventure 2024')",
        },
        destinations: {
          type: "array",
          items: { type: "string" },
          description: "List of cities to visit",
        },
        start_date: {
          type: "string",
          description: "Start date (ISO format: YYYY-MM-DD)",
        },
        end_date: {
          type: "string",
          description: "End date (ISO format: YYYY-MM-DD)",
        },
        description: {
          type: "string",
          description: "Optional trip description",
        },
      },
      required: ["user_id", "title", "destinations", "start_date", "end_date"],
    },
  },
  {
    name: "trip_get",
    description: "Get details of a specific trip including all itinerary items.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID to retrieve",
        },
        include_items: {
          type: "boolean",
          description: "Include itinerary items (default: true)",
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "trip_list",
    description: "List all trips for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID to list trips for",
        },
        status: {
          type: "string",
          enum: ["planning", "upcoming", "ongoing", "completed"],
          description: "Filter by trip status",
        },
        limit: {
          type: "number",
          description: "Maximum trips to return (default: 10)",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "trip_update",
    description: "Update trip details (title, dates, description).",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID to update",
        },
        title: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["planning", "upcoming", "ongoing", "completed"],
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "itinerary_add_item",
    description: "Add a destination or activity to a trip's itinerary.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID",
        },
        day: {
          type: "number",
          description: "Day number (1-indexed)",
        },
        destination_slug: {
          type: "string",
          description: "Slug of the destination to add (optional for custom items)",
        },
        title: {
          type: "string",
          description: "Custom title (auto-populated if destination_slug provided)",
        },
        time: {
          type: "string",
          description: "Time slot (e.g., '14:30')",
        },
        duration: {
          type: "number",
          description: "Duration in minutes",
        },
        notes: {
          type: "string",
          description: "Additional notes",
        },
        type: {
          type: "string",
          enum: ["place", "flight", "hotel", "train", "activity", "custom"],
          description: "Type of itinerary item",
        },
      },
      required: ["trip_id", "day"],
    },
  },
  {
    name: "itinerary_remove_item",
    description: "Remove an item from the itinerary.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: {
          type: "string",
          description: "Itinerary item ID to remove",
        },
      },
      required: ["item_id"],
    },
  },
  {
    name: "itinerary_reorder",
    description: "Reorder items within a day or move items between days.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID",
        },
        item_id: {
          type: "string",
          description: "Item ID to move",
        },
        new_day: {
          type: "number",
          description: "New day number",
        },
        new_order: {
          type: "number",
          description: "New position within the day",
        },
      },
      required: ["trip_id", "item_id", "new_day", "new_order"],
    },
  },
  {
    name: "itinerary_generate",
    description:
      "AI-powered itinerary generation. Creates a complete day-by-day plan based on destinations, interests, and constraints.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID to generate itinerary for",
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "User interests (e.g., ['architecture', 'food', 'art'])",
        },
        pace: {
          type: "string",
          enum: ["relaxed", "moderate", "packed"],
          description: "Desired trip pace",
        },
        must_include: {
          type: "array",
          items: { type: "string" },
          description: "Destination slugs that must be included",
        },
        avoid: {
          type: "array",
          items: { type: "string" },
          description: "Categories or types to avoid",
        },
        meal_preferences: {
          type: "object",
          properties: {
            breakfast: { type: "string", enum: ["skip", "hotel", "cafe", "restaurant"] },
            lunch: { type: "string", enum: ["skip", "quick", "sit_down"] },
            dinner: { type: "string", enum: ["casual", "fine_dining", "local"] },
          },
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "plan_day",
    description: "Generate or optimize a single day's itinerary with intelligent scheduling.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID",
        },
        day: {
          type: "number",
          description: "Day number to plan",
        },
        city: {
          type: "string",
          description: "City for this day",
        },
        start_time: {
          type: "string",
          description: "Day start time (default: '09:00')",
        },
        end_time: {
          type: "string",
          description: "Day end time (default: '22:00')",
        },
        fixed_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              destination_slug: { type: "string" },
              time: { type: "string" },
            },
          },
          description: "Items with fixed time slots (reservations, etc.)",
        },
        preferences: {
          type: "object",
          properties: {
            include_lunch: { type: "boolean" },
            include_dinner: { type: "boolean" },
            activity_types: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["trip_id", "day", "city"],
    },
  },
  {
    name: "itinerary_analyze",
    description:
      "Analyze an itinerary for potential issues like scheduling conflicts, missing meals, excessive travel time, or closure days.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID to analyze",
        },
        check_closures: {
          type: "boolean",
          description: "Check for destinations closed on specific days (default: true)",
        },
        check_travel_time: {
          type: "boolean",
          description: "Validate travel time between consecutive items (default: true)",
        },
      },
      required: ["trip_id"],
    },
  },
  {
    name: "itinerary_optimize",
    description: "Optimize itinerary order to minimize travel time and maximize efficiency.",
    inputSchema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "Trip ID to optimize",
        },
        day: {
          type: "number",
          description: "Specific day to optimize (optional, optimizes all if not provided)",
        },
        preserve_fixed: {
          type: "boolean",
          description: "Keep items with reservations in place (default: true)",
        },
      },
      required: ["trip_id"],
    },
  },
];

export async function handleTripTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "trip_create": {
      const { user_id, title, destinations, start_date, end_date, description } = args || {};

      if (!user_id || !title || !destinations || !start_date || !end_date) {
        return { content: [{ type: "text", text: "Error: Missing required fields" }] };
      }

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id,
          title,
          destination: JSON.stringify(destinations),
          start_date,
          end_date,
          description,
          status: "planning",
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error creating trip: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, trip: data }, null, 2),
          },
        ],
      };
    }

    case "trip_get": {
      const { trip_id, include_items = true } = args || {};

      if (!trip_id) {
        return { content: [{ type: "text", text: "Error: trip_id is required" }] };
      }

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", trip_id)
        .single();

      if (tripError) {
        return { content: [{ type: "text", text: `Error: ${tripError.message}` }] };
      }

      let items = null;
      if (include_items) {
        const { data } = await supabase
          .from("itinerary_items")
          .select("*")
          .eq("trip_id", trip_id)
          .order("day", { ascending: true })
          .order("order_index", { ascending: true });
        items = data;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ trip, items }, null, 2),
          },
        ],
      };
    }

    case "trip_list": {
      const { user_id, status, limit = 10 } = args || {};

      if (!user_id) {
        return { content: [{ type: "text", text: "Error: user_id is required" }] };
      }

      let query = supabase
        .from("trips")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: data?.length || 0, trips: data || [] }, null, 2),
          },
        ],
      };
    }

    case "trip_update": {
      const { trip_id, ...updates } = args || {};

      if (!trip_id) {
        return { content: [{ type: "text", text: "Error: trip_id is required" }] };
      }

      const updateData: Record<string, unknown> = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.start_date) updateData.start_date = updates.start_date;
      if (updates.end_date) updateData.end_date = updates.end_date;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status) updateData.status = updates.status;

      const { data, error } = await supabase
        .from("trips")
        .update(updateData)
        .eq("id", trip_id)
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, trip: data }, null, 2),
          },
        ],
      };
    }

    case "itinerary_add_item": {
      const { trip_id, day, destination_slug, title, time, duration, notes, type = "place" } = args || {};

      if (!trip_id || !day) {
        return { content: [{ type: "text", text: "Error: trip_id and day are required" }] };
      }

      // Get current max order_index for this day
      const { data: existingItems } = await supabase
        .from("itinerary_items")
        .select("order_index")
        .eq("trip_id", trip_id)
        .eq("day", day)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = existingItems && existingItems.length > 0 ? existingItems[0].order_index + 1 : 0;

      // If destination_slug provided, get destination details
      let itemTitle = title;
      let notesData: Record<string, unknown> = { type };

      if (destination_slug) {
        const { data: dest } = await supabase
          .from("destinations")
          .select("name, city, category, image, latitude, longitude")
          .eq("slug", destination_slug)
          .single();

        if (dest) {
          itemTitle = itemTitle || dest.name;
          notesData = {
            ...notesData,
            slug: destination_slug,
            city: dest.city,
            category: dest.category,
            image: dest.image,
            latitude: dest.latitude,
            longitude: dest.longitude,
            duration,
          };
        }
      }

      if (notes) {
        notesData.raw = notes;
      }

      const { data, error } = await supabase
        .from("itinerary_items")
        .insert({
          trip_id,
          day: Number(day),
          order_index: nextOrder,
          destination_slug: destination_slug || null,
          title: itemTitle || "Activity",
          time: time || null,
          notes: JSON.stringify(notesData),
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item: data }, null, 2),
          },
        ],
      };
    }

    case "itinerary_remove_item": {
      const { item_id } = args || {};

      if (!item_id) {
        return { content: [{ type: "text", text: "Error: item_id is required" }] };
      }

      const { error } = await supabase.from("itinerary_items").delete().eq("id", item_id);

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
      };
    }

    case "itinerary_reorder": {
      const { trip_id, item_id, new_day, new_order } = args || {};

      if (!trip_id || !item_id || new_day === undefined || new_order === undefined) {
        return { content: [{ type: "text", text: "Error: Missing required fields" }] };
      }

      const { data, error } = await supabase
        .from("itinerary_items")
        .update({ day: Number(new_day), order_index: Number(new_order) })
        .eq("id", item_id)
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, item: data }, null, 2),
          },
        ],
      };
    }

    case "itinerary_generate": {
      const { trip_id, interests, pace = "moderate", must_include, avoid, meal_preferences } = args || {};

      if (!trip_id) {
        return { content: [{ type: "text", text: "Error: trip_id is required" }] };
      }

      // Get trip details
      const { data: trip } = await supabase.from("trips").select("*").eq("id", trip_id).single();

      if (!trip) {
        return { content: [{ type: "text", text: "Error: Trip not found" }] };
      }

      // Parse destinations
      let destinations: string[] = [];
      try {
        destinations = JSON.parse(trip.destination || "[]");
      } catch {
        destinations = trip.destination ? [trip.destination] : [];
      }

      // Calculate trip days
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Items per day based on pace
      const paceMap: Record<string, number> = { relaxed: 3, moderate: 5, packed: 7 };
      const itemsPerDay = paceMap[pace as string] || 5;

      // Get destinations for each city
      const itinerary: Array<{
        day: number;
        city: string;
        items: Array<Record<string, unknown>>;
      }> = [];

      const daysPerCity = Math.ceil(days / destinations.length);

      for (let d = 1; d <= days; d++) {
        const cityIndex = Math.min(Math.floor((d - 1) / daysPerCity), destinations.length - 1);
        const city = destinations[cityIndex];

        // Build query for recommendations
        let query = supabase
          .from("destinations")
          .select("slug, name, city, category, micro_description, rating, image, latitude, longitude")
          .ilike("city", `%${city}%`)
          .order("rating", { ascending: false })
          .limit(itemsPerDay * 2);

        if (avoid && Array.isArray(avoid)) {
          for (const a of avoid as string[]) {
            const safeAvoid = sanitizeForIlike(a);
            query = query.not("category", "ilike", `%${safeAvoid}%`);
          }
        }

        const { data: cityDestinations } = await query;

        // Select items for this day
        const dayItems = (cityDestinations || []).slice(0, itemsPerDay).map((dest, idx) => ({
          order: idx,
          destination_slug: dest.slug,
          name: dest.name,
          category: dest.category,
          suggested_time: getTimeForIndex(idx, meal_preferences as Record<string, string> | undefined),
          rating: dest.rating,
        }));

        itinerary.push({ day: d, city, items: dayItems });
      }

      // Include must-have destinations
      if (must_include && Array.isArray(must_include)) {
        const { data: mustHaveDestinations } = await supabase
          .from("destinations")
          .select("slug, name, city, category")
          .in("slug", must_include as string[]);

        // Add to appropriate days
        mustHaveDestinations?.forEach((dest) => {
          const dayForCity = itinerary.find((d) => d.city.toLowerCase().includes(dest.city.toLowerCase()));
          if (dayForCity) {
            dayForCity.items.unshift({
              order: 0,
              destination_slug: dest.slug,
              name: dest.name,
              category: dest.category,
              suggested_time: "10:00",
              is_must_see: true,
            });
          }
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trip_id,
                total_days: days,
                pace,
                itinerary,
                note: "This is a suggested itinerary. Use itinerary_add_item to save items to the trip.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "plan_day": {
      const { trip_id, day, city, start_time = "09:00", end_time = "22:00", fixed_items, preferences } = args || {};

      if (!trip_id || !day || !city) {
        return { content: [{ type: "text", text: "Error: trip_id, day, and city are required" }] };
      }

      // Get recommendations for this city
      const prefs = preferences as Record<string, unknown> | undefined;
      const activityTypes = prefs?.activity_types as string[] | undefined;

      const safeCity = sanitizeForIlike(city as string);
      let query = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, latitude, longitude")
        .ilike("city", `%${safeCity}%`)
        .order("rating", { ascending: false })
        .limit(20);

      if (activityTypes && activityTypes.length > 0) {
        query = query.in("category", activityTypes);
      }

      const { data: destinations } = await query;

      // Build day schedule
      const schedule: Array<{
        time: string;
        end_time: string;
        destination_slug?: string;
        name: string;
        category: string;
        is_fixed?: boolean;
      }> = [];

      // Add fixed items first
      if (fixed_items && Array.isArray(fixed_items)) {
        for (const item of fixed_items as Array<{ destination_slug: string; time: string }>) {
          const dest = destinations?.find((d) => d.slug === item.destination_slug);
          if (dest) {
            schedule.push({
              time: item.time,
              end_time: addMinutes(item.time, 90),
              destination_slug: dest.slug,
              name: dest.name,
              category: dest.category,
              is_fixed: true,
            });
          }
        }
      }

      // Fill gaps with recommendations
      const slots = generateTimeSlots(start_time as string, end_time as string, schedule);
      let destIndex = 0;

      for (const slot of slots) {
        if (destinations && destIndex < destinations.length) {
          const dest = destinations[destIndex];
          // Skip if already in schedule
          if (!schedule.find((s) => s.destination_slug === dest.slug)) {
            schedule.push({
              time: slot.start,
              end_time: slot.end,
              destination_slug: dest.slug,
              name: dest.name,
              category: dest.category,
            });
            destIndex++;
          }
        }
      }

      // Sort by time
      schedule.sort((a, b) => a.time.localeCompare(b.time));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trip_id,
                day,
                city,
                schedule,
                note: "Use itinerary_add_item to save these to the trip.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "itinerary_analyze": {
      const { trip_id, check_closures = true, check_travel_time = true } = args || {};

      if (!trip_id) {
        return { content: [{ type: "text", text: "Error: trip_id is required" }] };
      }

      // Get trip and items
      const { data: items } = await supabase
        .from("itinerary_items")
        .select("*, destinations:destination_slug(name, opening_hours_json, latitude, longitude)")
        .eq("trip_id", trip_id)
        .order("day", { ascending: true })
        .order("order_index", { ascending: true });

      const issues: Array<{ type: string; severity: string; message: string; day?: number; item_id?: string }> = [];

      // Group by day
      const byDay = new Map<number, typeof items>();
      items?.forEach((item) => {
        if (!byDay.has(item.day)) byDay.set(item.day, []);
        byDay.get(item.day)!.push(item);
      });

      // Check each day
      for (const [day, dayItems] of byDay) {
        // Check for empty days
        if (dayItems.length === 0) {
          issues.push({
            type: "empty_day",
            severity: "warning",
            message: `Day ${day} has no planned activities`,
            day,
          });
        }

        // Check travel time between consecutive items
        if (check_travel_time && dayItems.length > 1) {
          for (let i = 0; i < dayItems.length - 1; i++) {
            const current = dayItems[i];
            const next = dayItems[i + 1];

            if (current.time && next.time) {
              const timeDiff = getMinutesBetween(current.time, next.time);
              if (timeDiff < 30) {
                issues.push({
                  type: "tight_schedule",
                  severity: "warning",
                  message: `Only ${timeDiff} minutes between "${current.title}" and "${next.title}" on day ${day}`,
                  day,
                  item_id: current.id,
                });
              }
            }
          }
        }

        // Check for meal gaps
        const hasMorning = dayItems.some((i) => i.time && i.time < "12:00");
        const hasLunch = dayItems.some(
          (i) => i.time && i.time >= "12:00" && i.time < "14:30" && i.title?.toLowerCase().includes("restaurant")
        );
        const hasDinner = dayItems.some(
          (i) => i.time && i.time >= "18:00" && i.title?.toLowerCase().includes("restaurant")
        );

        if (!hasLunch) {
          issues.push({
            type: "missing_meal",
            severity: "info",
            message: `No lunch planned for day ${day}`,
            day,
          });
        }
        if (!hasDinner) {
          issues.push({
            type: "missing_meal",
            severity: "info",
            message: `No dinner planned for day ${day}`,
            day,
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trip_id,
                total_issues: issues.length,
                issues,
                summary: {
                  errors: issues.filter((i) => i.severity === "error").length,
                  warnings: issues.filter((i) => i.severity === "warning").length,
                  info: issues.filter((i) => i.severity === "info").length,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "itinerary_optimize": {
      const { trip_id, day, preserve_fixed = true } = args || {};

      if (!trip_id) {
        return { content: [{ type: "text", text: "Error: trip_id is required" }] };
      }

      // Get items
      let query = supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", trip_id)
        .order("day", { ascending: true })
        .order("order_index", { ascending: true });

      if (day !== undefined) {
        query = query.eq("day", day);
      }

      const { data: items } = await query;

      if (!items || items.length === 0) {
        return { content: [{ type: "text", text: "No items to optimize" }] };
      }

      // Group by day and optimize each day's order
      const byDay = new Map<number, typeof items>();
      items.forEach((item) => {
        if (!byDay.has(item.day)) byDay.set(item.day, []);
        byDay.get(item.day)!.push(item);
      });

      const optimizations: Array<{ day: number; changes: Array<{ item_id: string; old_order: number; new_order: number }> }> = [];

      for (const [dayNum, dayItems] of byDay) {
        // Parse coordinates from notes
        const withCoords = dayItems.map((item) => {
          let notes: Record<string, unknown> = {};
          try {
            notes = JSON.parse(item.notes || "{}");
          } catch {
            // ignore
          }
          return {
            ...item,
            lat: notes.latitude as number | undefined,
            lng: notes.longitude as number | undefined,
            hasReservation: notes.bookingStatus === "booked",
          };
        });

        // Separate fixed and movable items
        const fixed = preserve_fixed ? withCoords.filter((i) => i.hasReservation) : [];
        const movable = preserve_fixed ? withCoords.filter((i) => !i.hasReservation) : withCoords;

        // Simple nearest-neighbor optimization for movable items
        if (movable.length > 1 && movable.some((i) => i.lat && i.lng)) {
          const optimized: typeof movable = [];
          const remaining = [...movable];

          // Start with first item
          optimized.push(remaining.shift()!);

          while (remaining.length > 0) {
            const last = optimized[optimized.length - 1];
            if (!last.lat || !last.lng) {
              optimized.push(remaining.shift()!);
              continue;
            }

            // Find nearest
            let nearestIdx = 0;
            let nearestDist = Infinity;
            remaining.forEach((item, idx) => {
              if (item.lat && item.lng) {
                const dist = Math.sqrt(Math.pow(item.lat - last.lat!, 2) + Math.pow(item.lng - last.lng!, 2));
                if (dist < nearestDist) {
                  nearestDist = dist;
                  nearestIdx = idx;
                }
              }
            });

            optimized.push(remaining.splice(nearestIdx, 1)[0]);
          }

          // Merge back with fixed items
          const merged = [...fixed, ...optimized].sort((a, b) => {
            if (a.hasReservation && a.time && b.hasReservation && b.time) {
              return a.time.localeCompare(b.time);
            }
            if (a.hasReservation) return -1;
            if (b.hasReservation) return 1;
            return 0;
          });

          // Calculate changes
          const changes = merged
            .map((item, newIdx) => ({
              item_id: item.id,
              old_order: item.order_index,
              new_order: newIdx,
            }))
            .filter((c) => c.old_order !== c.new_order);

          if (changes.length > 0) {
            optimizations.push({ day: dayNum, changes });
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trip_id,
                optimizations,
                note: "Review suggested changes. Use itinerary_reorder to apply them.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown trip tool: ${name}` }] };
  }
}

// Helper functions
function getTimeForIndex(idx: number, mealPrefs?: Record<string, string>): string {
  const times = ["09:30", "11:00", "13:00", "15:00", "17:00", "19:30", "21:00"];
  return times[idx] || "12:00";
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function getMinutesBetween(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function generateTimeSlots(
  start: string,
  end: string,
  fixed: Array<{ time: string; end_time: string }>
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  let current = start;

  // Simple slot generation (2-hour blocks)
  while (current < end) {
    const slotEnd = addMinutes(current, 120);
    const overlaps = fixed.some((f) => f.time < slotEnd && f.end_time > current);
    if (!overlaps) {
      slots.push({ start: current, end: slotEnd });
    }
    current = slotEnd;
  }

  return slots;
}
