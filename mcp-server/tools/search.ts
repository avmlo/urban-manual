/**
 * Search Tools
 *
 * Provides search capabilities for destinations including:
 * - Natural language search
 * - Semantic/vector search
 * - Category/city filtering
 * - Autocomplete
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";
import { searchVectors } from "../utils/vector.js";
import { sanitizeForIlike } from "../utils/sanitize.js";

export const searchTools: Tool[] = [
  {
    name: "search_destinations",
    description:
      "Search for travel destinations by query, city, category, or filters. Returns curated places from Urban Manual's database of 900+ destinations worldwide.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (e.g., 'romantic restaurants in Paris')",
        },
        city: {
          type: "string",
          description: "Filter by city name (e.g., 'London', 'Tokyo')",
        },
        country: {
          type: "string",
          description: "Filter by country name",
        },
        category: {
          type: "string",
          description: "Filter by category (restaurant, hotel, bar, cafe, museum, attraction, shop)",
        },
        neighborhood: {
          type: "string",
          description: "Filter by neighborhood within a city",
        },
        min_rating: {
          type: "number",
          description: "Minimum rating (1-5)",
        },
        michelin_stars: {
          type: "number",
          description: "Filter by Michelin stars (1, 2, or 3)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "search_semantic",
    description:
      "Perform semantic search using AI embeddings. Best for conceptual queries like 'cozy wine bars with great ambiance' or 'architecturally significant buildings'.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language query for semantic matching",
        },
        city: {
          type: "string",
          description: "Optional city filter",
        },
        category: {
          type: "string",
          description: "Optional category filter",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "autocomplete",
    description:
      "Get autocomplete suggestions for destination names, cities, or categories. Use for building search interfaces.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Partial text to autocomplete",
        },
        type: {
          type: "string",
          enum: ["destination", "city", "category", "all"],
          description: "Type of autocomplete (default: all)",
        },
        limit: {
          type: "number",
          description: "Maximum suggestions (default: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_by_architect",
    description: "Find destinations designed by a specific architect or design firm.",
    inputSchema: {
      type: "object",
      properties: {
        architect: {
          type: "string",
          description: "Architect or designer name",
        },
        style: {
          type: "string",
          description: "Architectural style (e.g., 'modernist', 'art deco')",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
    },
  },
  {
    name: "search_multimodal",
    description:
      "Advanced search combining multiple criteria for complex queries like 'Michelin restaurants near my hotel in Tokyo with outdoor seating'.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Complex natural language query",
        },
        context: {
          type: "object",
          properties: {
            current_city: { type: "string" },
            current_location: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
            },
            preferences: {
              type: "array",
              items: { type: "string" },
            },
          },
          description: "Additional context for better results",
        },
        filters: {
          type: "object",
          properties: {
            categories: { type: "array", items: { type: "string" } },
            price_range: { type: "array", items: { type: "number" } },
            open_now: { type: "boolean" },
          },
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
      required: ["query"],
    },
  },
];

export async function handleSearchTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "search_destinations": {
      const { query, city, country, category, neighborhood, min_rating, michelin_stars, limit = 10 } = args || {};

      let dbQuery = supabase
        .from("destinations")
        .select(
          "slug, name, city, country, neighborhood, category, micro_description, rating, michelin_stars, image, latitude, longitude"
        )
        .limit(Math.min(Number(limit), 50));

      if (city) {
        const safeCity = sanitizeForIlike(city as string);
        dbQuery = dbQuery.ilike("city", `%${safeCity}%`);
      }
      if (country) {
        const safeCountry = sanitizeForIlike(country as string);
        dbQuery = dbQuery.ilike("country", `%${safeCountry}%`);
      }
      if (category) {
        const safeCategory = sanitizeForIlike(category as string);
        dbQuery = dbQuery.ilike("category", `%${safeCategory}%`);
      }
      if (neighborhood) {
        const safeNeighborhood = sanitizeForIlike(neighborhood as string);
        dbQuery = dbQuery.ilike("neighborhood", `%${safeNeighborhood}%`);
      }
      if (min_rating) {
        dbQuery = dbQuery.gte("rating", Number(min_rating));
      }
      if (michelin_stars) {
        dbQuery = dbQuery.eq("michelin_stars", Number(michelin_stars));
      }
      if (query) {
        const safeQuery = sanitizeForIlike(query as string);
        dbQuery = dbQuery.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,micro_description.ilike.%${safeQuery}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
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

    case "search_semantic": {
      const { query, city, category, limit = 10 } = args || {};

      if (!query) {
        return { content: [{ type: "text", text: "Error: query is required" }] };
      }

      const results = await searchVectors(String(query), {
        city: city as string | undefined,
        category: category as string | undefined,
        limit: Number(limit),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: results.length,
                destinations: results,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "autocomplete": {
      const { query, type = "all", limit = 5 } = args || {};

      if (!query) {
        return { content: [{ type: "text", text: "Error: query is required" }] };
      }

      const suggestions: Array<{ type: string; value: string; metadata?: Record<string, unknown> }> = [];

      if (type === "all" || type === "destination") {
        const safeQuery = sanitizeForIlike(query as string);
        const { data: destinations } = await supabase
          .from("destinations")
          .select("name, slug, city, category")
          .ilike("name", `%${safeQuery}%`)
          .limit(Number(limit));

        destinations?.forEach((d) => {
          suggestions.push({
            type: "destination",
            value: d.name,
            metadata: { slug: d.slug, city: d.city, category: d.category },
          });
        });
      }

      if (type === "all" || type === "city") {
        const safeQuery = sanitizeForIlike(query as string);
        const { data: cities } = await supabase
          .from("destinations")
          .select("city")
          .ilike("city", `%${safeQuery}%`)
          .limit(Number(limit));

        const uniqueCities = [...new Set(cities?.map((c) => c.city))];
        uniqueCities.forEach((city) => {
          suggestions.push({ type: "city", value: city });
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ suggestions: suggestions.slice(0, Number(limit)) }, null, 2),
          },
        ],
      };
    }

    case "search_by_architect": {
      const { architect, style, limit = 10 } = args || {};

      let dbQuery = supabase
        .from("destinations")
        .select("slug, name, city, category, architect, architectural_style, design_story, image")
        .limit(Math.min(Number(limit), 50));

      if (architect) {
        const safeArchitect = sanitizeForIlike(architect as string);
        dbQuery = dbQuery.or(`architect.ilike.%${safeArchitect}%,design_firm.ilike.%${safeArchitect}%`);
      }
      if (style) {
        const safeStyle = sanitizeForIlike(style as string);
        dbQuery = dbQuery.ilike("architectural_style", `%${safeStyle}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: data?.length || 0, destinations: data || [] }, null, 2),
          },
        ],
      };
    }

    case "search_multimodal": {
      const { query, context, filters, limit = 10 } = args || {};

      // First do semantic search
      const semanticResults = await searchVectors(String(query), {
        city: (context as Record<string, unknown>)?.current_city as string | undefined,
        limit: Number(limit) * 2, // Get more for filtering
      });

      // Apply additional filters
      let filtered = semanticResults;
      if (filters) {
        const f = filters as Record<string, unknown>;
        if (f.categories && Array.isArray(f.categories)) {
          filtered = filtered.filter((r) =>
            (f.categories as string[]).some((c) => r.category?.toLowerCase().includes(c.toLowerCase()))
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: filtered.slice(0, Number(limit)).length,
                destinations: filtered.slice(0, Number(limit)),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown search tool: ${name}` }] };
  }
}
