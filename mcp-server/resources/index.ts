/**
 * MCP Resources
 *
 * Expose Urban Manual data as MCP resources for AI assistants to read.
 * Resources are read-only data sources that can be referenced in conversations.
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";

// Define available resources
export const resources: Resource[] = [
  {
    uri: "urbanmanual://destinations",
    name: "All Destinations",
    description: "Complete list of all 900+ curated destinations in Urban Manual",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://destinations/{city}",
    name: "Destinations by City",
    description: "All destinations in a specific city. Replace {city} with city name.",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://destination/{slug}",
    name: "Destination Details",
    description: "Full details for a specific destination by slug",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://cities",
    name: "Cities List",
    description: "List of all cities with destinations and their counts",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://categories",
    name: "Categories List",
    description: "List of all destination categories and their counts",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://architects",
    name: "Architects Database",
    description: "Information about architects and designers featured in Urban Manual",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://movements",
    name: "Architectural Movements",
    description: "Architectural movements and styles represented in the destinations",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://user/{user_id}/trips",
    name: "User Trips",
    description: "All trips for a specific user",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://user/{user_id}/saved",
    name: "User Saved Places",
    description: "Saved/bookmarked destinations for a user",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://user/{user_id}/visited",
    name: "User Visited Places",
    description: "Places a user has visited",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://user/{user_id}/collections",
    name: "User Collections",
    description: "User's custom collections of destinations",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://trending",
    name: "Trending Destinations",
    description: "Currently trending and popular destinations",
    mimeType: "application/json",
  },
  {
    uri: "urbanmanual://stats",
    name: "Platform Statistics",
    description: "Overall statistics about Urban Manual's destination database",
    mimeType: "application/json",
  },
];

// Handle resource read requests
export async function handleResourceRead(
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const supabase = createServiceClient();

  // Parse URI
  const parsed = new URL(uri);
  const path = parsed.pathname.replace(/^\/\//, "");
  const parts = path.split("/").filter(Boolean);

  try {
    // Route to appropriate handler
    if (uri === "urbanmanual://destinations") {
      return await getAllDestinations(supabase);
    }

    if (uri === "urbanmanual://cities") {
      return await getCities(supabase);
    }

    if (uri === "urbanmanual://categories") {
      return await getCategories(supabase);
    }

    if (uri === "urbanmanual://architects") {
      return await getArchitects(supabase);
    }

    if (uri === "urbanmanual://movements") {
      return await getMovements(supabase);
    }

    if (uri === "urbanmanual://trending") {
      return await getTrending(supabase);
    }

    if (uri === "urbanmanual://stats") {
      return await getStats(supabase);
    }

    // Parameterized resources
    if (parts[0] === "destinations" && parts[1]) {
      return await getDestinationsByCity(supabase, parts[1]);
    }

    if (parts[0] === "destination" && parts[1]) {
      return await getDestinationBySlug(supabase, parts[1]);
    }

    if (parts[0] === "user" && parts[1]) {
      const userId = parts[1];
      const resourceType = parts[2];

      switch (resourceType) {
        case "trips":
          return await getUserTrips(supabase, userId);
        case "saved":
          return await getUserSaved(supabase, userId);
        case "visited":
          return await getUserVisited(supabase, userId);
        case "collections":
          return await getUserCollections(supabase, userId);
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Resource not found" }),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      ],
    };
  }
}

// Resource handlers
async function getAllDestinations(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, city, country, category, micro_description, rating, michelin_stars")
    .order("city")
    .order("name");

  if (error) throw error;

  return {
    contents: [
      {
        uri: "urbanmanual://destinations",
        mimeType: "application/json",
        text: JSON.stringify({ count: data?.length || 0, destinations: data || [] }, null, 2),
      },
    ],
  };
}

async function getDestinationsByCity(supabase: ReturnType<typeof createServiceClient>, city: string) {
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, city, category, micro_description, rating, image, michelin_stars, neighborhood")
    .ilike("city", `%${decodeURIComponent(city)}%`)
    .order("rating", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://destinations/${city}`,
        mimeType: "application/json",
        text: JSON.stringify({ city: decodeURIComponent(city), count: data?.length || 0, destinations: data || [] }, null, 2),
      },
    ],
  };
}

async function getDestinationBySlug(supabase: ReturnType<typeof createServiceClient>, slug: string) {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", decodeURIComponent(slug))
    .single();

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://destination/${slug}`,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function getCities(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase.from("destinations").select("city, country");

  if (error) throw error;

  const counts = new Map<string, { count: number; country: string }>();
  data?.forEach((d) => {
    if (!counts.has(d.city)) {
      counts.set(d.city, { count: 0, country: d.country || "Unknown" });
    }
    counts.get(d.city)!.count++;
  });

  const cities = Array.from(counts.entries())
    .map(([name, info]) => ({ name, country: info.country, destination_count: info.count }))
    .sort((a, b) => b.destination_count - a.destination_count);

  return {
    contents: [
      {
        uri: "urbanmanual://cities",
        mimeType: "application/json",
        text: JSON.stringify({ total_cities: cities.length, cities }, null, 2),
      },
    ],
  };
}

async function getCategories(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase.from("destinations").select("category");

  if (error) throw error;

  const counts = new Map<string, number>();
  data?.forEach((d) => {
    const cat = d.category?.toLowerCase() || "other";
    counts.set(cat, (counts.get(cat) || 0) + 1);
  });

  const categories = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    contents: [
      {
        uri: "urbanmanual://categories",
        mimeType: "application/json",
        text: JSON.stringify({ total_categories: categories.length, categories }, null, 2),
      },
    ],
  };
}

async function getArchitects(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("architects")
    .select("*")
    .order("name");

  if (error) {
    // Table might not exist, return data from destinations
    const { data: destData } = await supabase
      .from("destinations")
      .select("design_firm, architectural_style")
      .not("design_firm", "is", null);

    const architects = new Map<string, { count: number; styles: Set<string> }>();
    destData?.forEach((d) => {
      if (d.design_firm) {
        if (!architects.has(d.design_firm)) {
          architects.set(d.design_firm, { count: 0, styles: new Set() });
        }
        architects.get(d.design_firm)!.count++;
        if (d.architectural_style) {
          architects.get(d.design_firm)!.styles.add(d.architectural_style);
        }
      }
    });

    const list = Array.from(architects.entries())
      .map(([name, info]) => ({ name, destination_count: info.count, styles: Array.from(info.styles) }))
      .sort((a, b) => b.destination_count - a.destination_count);

    return {
      contents: [
        {
          uri: "urbanmanual://architects",
          mimeType: "application/json",
          text: JSON.stringify({ count: list.length, architects: list }, null, 2),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: "urbanmanual://architects",
        mimeType: "application/json",
        text: JSON.stringify({ count: data?.length || 0, architects: data || [] }, null, 2),
      },
    ],
  };
}

async function getMovements(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase.from("movements").select("*").order("name");

  if (error) {
    // Table might not exist, return data from destinations
    const { data: destData } = await supabase
      .from("destinations")
      .select("architectural_style, design_period")
      .not("architectural_style", "is", null);

    const styles = new Map<string, number>();
    destData?.forEach((d) => {
      if (d.architectural_style) {
        styles.set(d.architectural_style, (styles.get(d.architectural_style) || 0) + 1);
      }
    });

    const list = Array.from(styles.entries())
      .map(([name, count]) => ({ name, destination_count: count }))
      .sort((a, b) => b.destination_count - a.destination_count);

    return {
      contents: [
        {
          uri: "urbanmanual://movements",
          mimeType: "application/json",
          text: JSON.stringify({ count: list.length, movements: list }, null, 2),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: "urbanmanual://movements",
        mimeType: "application/json",
        text: JSON.stringify({ count: data?.length || 0, movements: data || [] }, null, 2),
      },
    ],
  };
}

async function getTrending(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, city, category, micro_description, rating, image, views_count, saves_count")
    .order("views_count", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) throw error;

  return {
    contents: [
      {
        uri: "urbanmanual://trending",
        mimeType: "application/json",
        text: JSON.stringify({ count: data?.length || 0, trending: data || [] }, null, 2),
      },
    ],
  };
}

async function getStats(supabase: ReturnType<typeof createServiceClient>) {
  const { count: totalDestinations } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true });

  const { data: cityData } = await supabase.from("destinations").select("city");
  const uniqueCities = new Set(cityData?.map((d) => d.city)).size;

  const { data: countryData } = await supabase.from("destinations").select("country");
  const uniqueCountries = new Set(countryData?.map((d) => d.country).filter(Boolean)).size;

  const { count: michelinCount } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .gt("michelin_stars", 0);

  return {
    contents: [
      {
        uri: "urbanmanual://stats",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            total_destinations: totalDestinations || 0,
            total_cities: uniqueCities,
            total_countries: uniqueCountries,
            michelin_starred: michelinCount || 0,
            last_updated: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getUserTrips(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://user/${userId}/trips`,
        mimeType: "application/json",
        text: JSON.stringify({ user_id: userId, count: data?.length || 0, trips: data || [] }, null, 2),
      },
    ],
  };
}

async function getUserSaved(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("saved_places")
    .select("destination_slug, created_at")
    .eq("user_id", userId);

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://user/${userId}/saved`,
        mimeType: "application/json",
        text: JSON.stringify({ user_id: userId, count: data?.length || 0, saved: data || [] }, null, 2),
      },
    ],
  };
}

async function getUserVisited(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("visited_places")
    .select("destination_slug, visited_at, rating, notes")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false });

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://user/${userId}/visited`,
        mimeType: "application/json",
        text: JSON.stringify({ user_id: userId, count: data?.length || 0, visited: data || [] }, null, 2),
      },
    ],
  };
}

async function getUserCollections(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    contents: [
      {
        uri: `urbanmanual://user/${userId}/collections`,
        mimeType: "application/json",
        text: JSON.stringify({ user_id: userId, count: data?.length || 0, collections: data || [] }, null, 2),
      },
    ],
  };
}
