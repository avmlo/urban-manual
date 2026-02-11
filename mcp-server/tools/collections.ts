/**
 * Collection Tools
 *
 * Tools for managing user collections of destinations:
 * - Create and manage collections
 * - Add/remove destinations
 * - Share collections
 * - Saved and visited places
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";

export const collectionTools: Tool[] = [
  {
    name: "collection_create",
    description: "Create a new collection for organizing saved destinations.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID creating the collection",
        },
        name: {
          type: "string",
          description: "Collection name (e.g., 'Best Coffee Shops')",
        },
        description: {
          type: "string",
          description: "Optional description",
        },
        is_public: {
          type: "boolean",
          description: "Whether the collection is publicly visible (default: false)",
        },
        city: {
          type: "string",
          description: "Optional city to associate with the collection",
        },
      },
      required: ["user_id", "name"],
    },
  },
  {
    name: "collection_list",
    description: "List all collections for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID",
        },
        include_counts: {
          type: "boolean",
          description: "Include destination count per collection (default: true)",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "collection_get",
    description: "Get a collection with all its destinations.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: {
          type: "string",
          description: "Collection ID",
        },
        include_destination_details: {
          type: "boolean",
          description: "Include full destination details (default: true)",
        },
      },
      required: ["collection_id"],
    },
  },
  {
    name: "collection_add_destination",
    description: "Add a destination to a collection.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: {
          type: "string",
          description: "Collection ID",
        },
        destination_slug: {
          type: "string",
          description: "Destination slug to add",
        },
        notes: {
          type: "string",
          description: "Optional personal notes about this destination",
        },
      },
      required: ["collection_id", "destination_slug"],
    },
  },
  {
    name: "collection_remove_destination",
    description: "Remove a destination from a collection.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: {
          type: "string",
          description: "Collection ID",
        },
        destination_slug: {
          type: "string",
          description: "Destination slug to remove",
        },
      },
      required: ["collection_id", "destination_slug"],
    },
  },
  {
    name: "collection_delete",
    description: "Delete a collection.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: {
          type: "string",
          description: "Collection ID to delete",
        },
      },
      required: ["collection_id"],
    },
  },
  {
    name: "collection_save_place",
    description: "Save a destination to the user's saved places (quick save without collection).",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID",
        },
        destination_slug: {
          type: "string",
          description: "Destination slug to save",
        },
      },
      required: ["user_id", "destination_slug"],
    },
  },
  {
    name: "collection_mark_visited",
    description: "Mark a destination as visited.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID",
        },
        destination_slug: {
          type: "string",
          description: "Destination slug",
        },
        visited_at: {
          type: "string",
          description: "Date visited (ISO format, defaults to now)",
        },
        rating: {
          type: "number",
          description: "Personal rating 1-5",
        },
        notes: {
          type: "string",
          description: "Personal notes about the visit",
        },
      },
      required: ["user_id", "destination_slug"],
    },
  },
  {
    name: "collection_get_saved",
    description: "Get all saved destinations for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID",
        },
        city: {
          type: "string",
          description: "Optional city filter",
        },
        category: {
          type: "string",
          description: "Optional category filter",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "collection_get_visited",
    description: "Get all visited destinations for a user.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "User ID",
        },
        city: {
          type: "string",
          description: "Optional city filter",
        },
        include_stats: {
          type: "boolean",
          description: "Include visit statistics (default: true)",
        },
      },
      required: ["user_id"],
    },
  },
];

export async function handleCollectionTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "collection_create": {
      const { user_id, name: collectionName, description, is_public = false, city } = args || {};

      if (!user_id || !collectionName) {
        return { content: [{ type: "text", text: "Error: user_id and name are required" }] };
      }

      const { data, error } = await supabase
        .from("lists")
        .insert({
          user_id,
          name: collectionName,
          description: description || null,
          is_public,
          city: city || null,
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
            text: JSON.stringify({ success: true, collection: data }, null, 2),
          },
        ],
      };
    }

    case "collection_list": {
      const { user_id, include_counts = true } = args || {};

      if (!user_id) {
        return { content: [{ type: "text", text: "Error: user_id is required" }] };
      }

      const { data: collections, error } = await supabase
        .from("lists")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      let result = collections || [];

      if (include_counts && result.length > 0) {
        // Get counts for each collection
        const { data: items } = await supabase
          .from("list_items")
          .select("list_id")
          .in(
            "list_id",
            result.map((c) => c.id)
          );

        const counts = new Map<string, number>();
        items?.forEach((item) => {
          counts.set(item.list_id, (counts.get(item.list_id) || 0) + 1);
        });

        result = result.map((c) => ({
          ...c,
          destination_count: counts.get(c.id) || 0,
        }));
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: result.length, collections: result }, null, 2),
          },
        ],
      };
    }

    case "collection_get": {
      const { collection_id, include_destination_details = true } = args || {};

      if (!collection_id) {
        return { content: [{ type: "text", text: "Error: collection_id is required" }] };
      }

      const { data: collection, error } = await supabase
        .from("lists")
        .select("*")
        .eq("id", collection_id)
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Get collection items
      const { data: items } = await supabase
        .from("list_items")
        .select("destination_slug, notes, created_at")
        .eq("list_id", collection_id);

      let destinations = items || [];

      if (include_destination_details && destinations.length > 0) {
        const { data: destDetails } = await supabase
          .from("destinations")
          .select("slug, name, city, category, micro_description, rating, image")
          .in(
            "slug",
            destinations.map((d) => d.destination_slug)
          );

        const detailMap = new Map(destDetails?.map((d) => [d.slug, d]));
        destinations = destinations.map((item) => ({
          ...item,
          destination: detailMap.get(item.destination_slug) || null,
        }));
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                collection,
                destination_count: destinations.length,
                destinations,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "collection_add_destination": {
      const { collection_id, destination_slug, notes } = args || {};

      if (!collection_id || !destination_slug) {
        return { content: [{ type: "text", text: "Error: collection_id and destination_slug required" }] };
      }

      const { data, error } = await supabase
        .from("list_items")
        .insert({
          list_id: collection_id,
          destination_slug,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { content: [{ type: "text", text: "Destination already in collection" }] };
        }
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

    case "collection_remove_destination": {
      const { collection_id, destination_slug } = args || {};

      if (!collection_id || !destination_slug) {
        return { content: [{ type: "text", text: "Error: collection_id and destination_slug required" }] };
      }

      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", collection_id)
        .eq("destination_slug", destination_slug);

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
      };
    }

    case "collection_delete": {
      const { collection_id } = args || {};

      if (!collection_id) {
        return { content: [{ type: "text", text: "Error: collection_id required" }] };
      }

      // Delete items first
      await supabase.from("list_items").delete().eq("list_id", collection_id);

      // Delete collection
      const { error } = await supabase.from("lists").delete().eq("id", collection_id);

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
      };
    }

    case "collection_save_place": {
      const { user_id, destination_slug } = args || {};

      if (!user_id || !destination_slug) {
        return { content: [{ type: "text", text: "Error: user_id and destination_slug required" }] };
      }

      const { data, error } = await supabase
        .from("saved_places")
        .upsert({ user_id, destination_slug }, { onConflict: "user_id,destination_slug" })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, saved: data }, null, 2),
          },
        ],
      };
    }

    case "collection_mark_visited": {
      const { user_id, destination_slug, visited_at, rating, notes } = args || {};

      if (!user_id || !destination_slug) {
        return { content: [{ type: "text", text: "Error: user_id and destination_slug required" }] };
      }

      const { data, error } = await supabase
        .from("visited_places")
        .upsert(
          {
            user_id,
            destination_slug,
            visited_at: visited_at || new Date().toISOString(),
            rating: rating || null,
            notes: notes || null,
          },
          { onConflict: "user_id,destination_slug" }
        )
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, visited: data }, null, 2),
          },
        ],
      };
    }

    case "collection_get_saved": {
      const { user_id, city, category } = args || {};

      if (!user_id) {
        return { content: [{ type: "text", text: "Error: user_id required" }] };
      }

      const { data: saved } = await supabase.from("saved_places").select("destination_slug, created_at").eq("user_id", user_id);

      if (!saved || saved.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: 0, saved: [] }, null, 2),
            },
          ],
        };
      }

      // Get destination details
      let destQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, micro_description, rating, image")
        .in(
          "slug",
          saved.map((s) => s.destination_slug)
        );

      if (city) {
        destQuery = destQuery.ilike("city", `%${city}%`);
      }
      if (category) {
        destQuery = destQuery.ilike("category", `%${category}%`);
      }

      const { data: destinations } = await destQuery;

      const result = saved
        .map((s) => ({
          ...s,
          destination: destinations?.find((d) => d.slug === s.destination_slug),
        }))
        .filter((s) => s.destination);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: result.length, saved: result }, null, 2),
          },
        ],
      };
    }

    case "collection_get_visited": {
      const { user_id, city, include_stats = true } = args || {};

      if (!user_id) {
        return { content: [{ type: "text", text: "Error: user_id required" }] };
      }

      const { data: visited } = await supabase
        .from("visited_places")
        .select("destination_slug, visited_at, rating, notes")
        .eq("user_id", user_id)
        .order("visited_at", { ascending: false });

      if (!visited || visited.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: 0, visited: [], stats: null }, null, 2),
            },
          ],
        };
      }

      // Get destination details
      let destQuery = supabase
        .from("destinations")
        .select("slug, name, city, country, category, micro_description, rating, image")
        .in(
          "slug",
          visited.map((v) => v.destination_slug)
        );

      if (city) {
        destQuery = destQuery.ilike("city", `%${city}%`);
      }

      const { data: destinations } = await destQuery;

      const result = visited
        .map((v) => ({
          ...v,
          destination: destinations?.find((d) => d.slug === v.destination_slug),
        }))
        .filter((v) => v.destination);

      let stats = null;
      if (include_stats) {
        const cities = new Set(result.map((r) => r.destination?.city).filter(Boolean));
        const countries = new Set(result.map((r) => r.destination?.country).filter(Boolean));
        const categories = new Map<string, number>();
        result.forEach((r) => {
          const cat = r.destination?.category || "other";
          categories.set(cat, (categories.get(cat) || 0) + 1);
        });

        stats = {
          total_places: result.length,
          cities_count: cities.size,
          countries_count: countries.size,
          by_category: Object.fromEntries(categories),
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: result.length, visited: result, stats }, null, 2),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown collection tool: ${name}` }] };
  }
}
