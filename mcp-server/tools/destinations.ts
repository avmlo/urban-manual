/**
 * Destination Tools
 *
 * Tools for working with individual destinations:
 * - Get destination details
 * - Find nearby places
 * - Calculate distances
 * - Get photos and reviews
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";
import { sanitizeForIlike } from "../utils/sanitize.js";

export const destinationTools: Tool[] = [
  {
    name: "destination_get",
    description: "Get full details of a specific destination by its slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Destination slug (e.g., 'noma-copenhagen')",
        },
        include_reviews: {
          type: "boolean",
          description: "Include Google reviews (default: false)",
        },
        include_photos: {
          type: "boolean",
          description: "Include photo URLs (default: true)",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "destination_get_by_id",
    description: "Get destination by database ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "Destination database ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "nearby_places",
    description: "Find destinations near a given location or another destination.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
          description: "Latitude coordinate",
        },
        longitude: {
          type: "number",
          description: "Longitude coordinate",
        },
        destination_slug: {
          type: "string",
          description: "Alternative: find places near this destination",
        },
        radius_km: {
          type: "number",
          description: "Search radius in kilometers (default: 2)",
        },
        category: {
          type: "string",
          description: "Filter by category",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
    },
  },
  {
    name: "calculate_distance",
    description: "Calculate distance and travel time between two destinations.",
    inputSchema: {
      type: "object",
      properties: {
        from_slug: {
          type: "string",
          description: "Starting destination slug",
        },
        to_slug: {
          type: "string",
          description: "Ending destination slug",
        },
        from_coords: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
          description: "Alternative: starting coordinates",
        },
        to_coords: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
          description: "Alternative: ending coordinates",
        },
        mode: {
          type: "string",
          enum: ["walking", "driving", "transit"],
          description: "Travel mode (default: walking)",
        },
      },
    },
  },
  {
    name: "destination_opening_hours",
    description: "Get opening hours for a destination.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Destination slug",
        },
        date: {
          type: "string",
          description: "Specific date to check (ISO format, optional)",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "destination_list_by_city",
    description: "Get all destinations in a city, optionally filtered by category.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name",
        },
        category: {
          type: "string",
          description: "Filter by category",
        },
        sort_by: {
          type: "string",
          enum: ["rating", "name", "popularity"],
          description: "Sort order (default: rating)",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 20)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "destination_categories",
    description: "Get available categories for a city or globally.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Optional city to filter by",
        },
      },
    },
  },
  {
    name: "destination_cities",
    description: "Get list of all cities with destinations.",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Optional country filter",
        },
        min_destinations: {
          type: "number",
          description: "Minimum destinations in city (default: 1)",
        },
      },
    },
  },
];

export async function handleDestinationTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "destination_get": {
      const { slug, include_reviews = false, include_photos = true } = args || {};

      if (!slug) {
        return { content: [{ type: "text", text: "Error: slug is required" }] };
      }

      const { data, error } = await supabase.from("destinations").select("*").eq("slug", slug).single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      if (!data) {
        return { content: [{ type: "text", text: "Destination not found" }] };
      }

      // Format response
      const response: Record<string, unknown> = {
        slug: data.slug,
        name: data.name,
        city: data.city,
        country: data.country,
        neighborhood: data.neighborhood,
        category: data.category,
        description: data.description,
        micro_description: data.micro_description,
        rating: data.rating,
        price_level: data.price_level,
        michelin_stars: data.michelin_stars,
        coordinates: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        contact: {
          phone: data.phone_number,
          website: data.website,
          instagram: data.instagram_handle,
          google_maps_url: data.google_maps_url,
        },
        booking: {
          opentable_url: data.opentable_url,
          resy_url: data.resy_url,
          booking_url: data.booking_url,
        },
        architecture: {
          architect: data.architect,
          style: data.architectural_style,
          period: data.design_period,
          significance: data.architectural_significance,
          design_story: data.design_story,
        },
        engagement: {
          views: data.views_count,
          saves: data.saves_count,
          visits: data.visits_count,
        },
      };

      if (include_photos) {
        response.images = {
          primary: data.image,
          thumbnail: data.image_thumbnail,
          google_photos: data.photos_json,
        };
      }

      if (include_reviews && data.reviews_json) {
        response.reviews = data.reviews_json;
      }

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    }

    case "destination_get_by_id": {
      const { id } = args || {};

      if (!id) {
        return { content: [{ type: "text", text: "Error: id is required" }] };
      }

      const { data, error } = await supabase.from("destinations").select("*").eq("id", id).single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    case "nearby_places": {
      const { latitude, longitude, destination_slug, radius_km = 2, category, limit = 10 } = args || {};

      let lat = latitude as number | undefined;
      let lng = longitude as number | undefined;

      // If destination_slug provided, get its coordinates
      if (destination_slug && (!lat || !lng)) {
        const { data: dest } = await supabase
          .from("destinations")
          .select("latitude, longitude")
          .eq("slug", destination_slug)
          .single();

        if (dest) {
          lat = dest.latitude;
          lng = dest.longitude;
        }
      }

      if (!lat || !lng) {
        return { content: [{ type: "text", text: "Error: coordinates required (provide lat/lng or destination_slug)" }] };
      }

      // Calculate bounding box
      const radiusDegrees = Number(radius_km) / 111; // rough conversion

      let query = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, latitude, longitude, image")
        .gte("latitude", lat - radiusDegrees)
        .lte("latitude", lat + radiusDegrees)
        .gte("longitude", lng - radiusDegrees)
        .lte("longitude", lng + radiusDegrees)
        .limit(Number(limit) * 2);

      if (category) {
        const safeCategory = sanitizeForIlike(category as string);
        query = query.ilike("category", `%${safeCategory}%`);
      }

      if (destination_slug) {
        query = query.neq("slug", destination_slug);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Calculate actual distances and sort
      const withDistances = (data || [])
        .map((dest) => {
          const dLat = (dest.latitude! - lat!) * 111;
          const dLng = (dest.longitude! - lng!) * 111 * Math.cos(lat! * (Math.PI / 180));
          const distance_km = Math.sqrt(dLat * dLat + dLng * dLng);
          return { ...dest, distance_km: Math.round(distance_km * 100) / 100 };
        })
        .filter((d) => d.distance_km <= Number(radius_km))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, Number(limit));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                center: { latitude: lat, longitude: lng },
                radius_km,
                count: withDistances.length,
                places: withDistances,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "calculate_distance": {
      const { from_slug, to_slug, from_coords, to_coords, mode = "walking" } = args || {};

      let fromLat: number | undefined, fromLng: number | undefined;
      let toLat: number | undefined, toLng: number | undefined;

      // Get coordinates
      if (from_slug) {
        const { data } = await supabase
          .from("destinations")
          .select("latitude, longitude")
          .eq("slug", from_slug)
          .single();
        if (data) {
          fromLat = data.latitude;
          fromLng = data.longitude;
        }
      } else if (from_coords && typeof from_coords === "object") {
        const fc = from_coords as { latitude?: number; longitude?: number };
        fromLat = fc.latitude;
        fromLng = fc.longitude;
      }

      if (to_slug) {
        const { data } = await supabase
          .from("destinations")
          .select("latitude, longitude")
          .eq("slug", to_slug)
          .single();
        if (data) {
          toLat = data.latitude;
          toLng = data.longitude;
        }
      } else if (to_coords && typeof to_coords === "object") {
        const tc = to_coords as { latitude?: number; longitude?: number };
        toLat = tc.latitude;
        toLng = tc.longitude;
      }

      if (!fromLat || !fromLng || !toLat || !toLng) {
        return { content: [{ type: "text", text: "Error: Could not determine coordinates" }] };
      }

      // Calculate haversine distance
      const R = 6371; // Earth's radius in km
      const dLat = ((toLat - fromLat) * Math.PI) / 180;
      const dLng = ((toLng - fromLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((fromLat * Math.PI) / 180) *
          Math.cos((toLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance_km = R * c;

      // Estimate travel time based on mode
      const speedKmh: Record<string, number> = {
        walking: 5,
        driving: 30, // city average
        transit: 20,
      };
      const speed = speedKmh[mode as string] || 5;
      const duration_minutes = Math.round((distance_km / speed) * 60);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                from: from_slug || from_coords,
                to: to_slug || to_coords,
                mode,
                distance: {
                  km: Math.round(distance_km * 100) / 100,
                  miles: Math.round(distance_km * 0.621371 * 100) / 100,
                },
                estimated_duration_minutes: duration_minutes,
                note: "Travel time is estimated. Actual time may vary based on traffic and route.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "destination_opening_hours": {
      const { slug, date } = args || {};

      if (!slug) {
        return { content: [{ type: "text", text: "Error: slug is required" }] };
      }

      const { data, error } = await supabase
        .from("destinations")
        .select("name, opening_hours_json, timezone_id")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        return { content: [{ type: "text", text: "Destination not found" }] };
      }

      const hours = data.opening_hours_json as Record<string, unknown> | null;

      if (!hours) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  name: data.name,
                  hours_available: false,
                  message: "Opening hours not available for this destination",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const response: Record<string, unknown> = {
        name: data.name,
        timezone: data.timezone_id,
        hours,
      };

      // If specific date requested, try to determine if open
      if (date) {
        const dayOfWeek = new Date(date as string).getDay();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        response.requested_date = date;
        response.day_of_week = days[dayOfWeek];

        if (hours.weekday_text && Array.isArray(hours.weekday_text)) {
          response.hours_for_day = (hours.weekday_text as string[])[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    }

    case "destination_list_by_city": {
      const { city, category, sort_by = "rating", limit = 20 } = args || {};

      if (!city) {
        return { content: [{ type: "text", text: "Error: city is required" }] };
      }

      const safeCity = sanitizeForIlike(city as string);
      let query = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, image, michelin_stars")
        .ilike("city", `%${safeCity}%`)
        .limit(Number(limit));

      if (category) {
        const safeCategory = sanitizeForIlike(category as string);
        query = query.ilike("category", `%${safeCategory}%`);
      }

      // Apply sorting
      switch (sort_by) {
        case "rating":
          query = query.order("rating", { ascending: false, nullsFirst: false });
          break;
        case "name":
          query = query.order("name", { ascending: true });
          break;
        case "popularity":
          query = query.order("views_count", { ascending: false, nullsFirst: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                city,
                category: category || "all",
                count: data?.length || 0,
                destinations: data || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "destination_categories": {
      const { city } = args || {};

      let query = supabase.from("destinations").select("category");

      if (city) {
        const safeCity = sanitizeForIlike(city as string);
        query = query.ilike("city", `%${safeCity}%`);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Count by category
      const counts = new Map<string, number>();
      data?.forEach((d) => {
        const cat = d.category?.toLowerCase() || "other";
        counts.set(cat, (counts.get(cat) || 0) + 1);
      });

      const categories = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                city: city || "all",
                total_categories: categories.length,
                categories,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "destination_cities": {
      const { country, min_destinations = 1 } = args || {};

      let query = supabase.from("destinations").select("city, country");

      if (country) {
        const safeCountry = sanitizeForIlike(country as string);
        query = query.ilike("country", `%${safeCountry}%`);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Count by city
      const counts = new Map<string, { count: number; country: string }>();
      data?.forEach((d) => {
        const city = d.city;
        if (!counts.has(city)) {
          counts.set(city, { count: 0, country: d.country || "Unknown" });
        }
        counts.get(city)!.count++;
      });

      const cities = Array.from(counts.entries())
        .filter(([, info]) => info.count >= Number(min_destinations))
        .map(([name, info]) => ({ name, country: info.country, destination_count: info.count }))
        .sort((a, b) => b.destination_count - a.destination_count);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_cities: cities.length,
                cities,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown destination tool: ${name}` }] };
  }
}
