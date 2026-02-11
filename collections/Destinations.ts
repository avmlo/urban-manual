import type { CollectionConfig } from "payload";

export const Destinations: CollectionConfig = {
  slug: "destinations",
  dbName: "destinations",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "city", "category", "crown", "image"],
    listSearchableFields: ["name", "city", "slug", "category"],
    group: "Content",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data && data.name && !data.slug) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        }
        // Auto-category for known brands
        if (data && data.name) {
          const nameLower = data.name.toLowerCase();
          if (
            nameLower.startsWith("apple") ||
            nameLower.startsWith("aesop") ||
            nameLower.startsWith("aēsop")
          ) {
            data.category = "Shopping";
          }
        }
        if (data && data.michelin_stars && data.michelin_stars > 0) {
          data.category = "Restaurant";
        }
        return data;
      },
    ],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        // Tab 1: Details
        {
          label: "Details",
          fields: [
            {
              type: "row",
              fields: [
                { name: "name", type: "text", required: true },
                { name: "slug", type: "text", required: true, unique: true },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "city", type: "text", required: true },
                { name: "country", type: "text" },
                { name: "neighborhood", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "category",
                  type: "select",
                  options: [
                    "Restaurant",
                    "Hotel",
                    "Bar",
                    "Cafe",
                    "Shopping",
                    "Museum",
                    "Gallery",
                    "Landmark",
                    "Park",
                    "Beach",
                    "Spa",
                    "Club",
                    "Theater",
                    "Market",
                    "Others",
                  ],
                },
                { name: "brand", type: "text" },
              ],
            },
            {
              name: "micro_description",
              type: "text",
              maxLength: 150,
              admin: {
                description: "Short 1-line description for cards (max 150 chars)",
              },
            },
            { name: "tags", type: "json" },
            {
              type: "row",
              fields: [
                { name: "crown", type: "checkbox", defaultValue: false },
                {
                  name: "michelin_stars",
                  type: "number",
                  min: 0,
                  max: 3,
                },
                {
                  name: "parent_destination_id",
                  type: "number",
                  admin: {
                    description: "ID of parent destination (e.g. hotel containing this bar)",
                  },
                },
              ],
            },
          ],
        },

        // Tab 2: Location
        {
          label: "Location",
          fields: [
            {
              type: "row",
              fields: [
                { name: "latitude", type: "number" },
                { name: "longitude", type: "number" },
              ],
            },
            { name: "formatted_address", type: "text" },
            {
              type: "row",
              fields: [
                { name: "place_id", type: "text" },
                { name: "google_maps_url", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "vicinity", type: "text" },
                { name: "timezone_id", type: "text" },
                { name: "utc_offset", type: "number" },
              ],
            },
          ],
        },

        // Tab 3: Media
        {
          label: "Media",
          fields: [
            { name: "image", type: "text", admin: { description: "Primary image URL" } },
            {
              type: "row",
              fields: [
                { name: "image_thumbnail", type: "text" },
                { name: "image_original", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "primary_photo_url", type: "text" },
                { name: "photo_count", type: "number" },
              ],
            },
            { name: "photos_json", type: "json" },
          ],
        },

        // Tab 4: Content
        {
          label: "Content",
          fields: [
            {
              name: "description",
              type: "textarea",
              admin: { description: "Short description" },
            },
            {
              name: "content",
              type: "textarea",
              admin: { description: "Full content/article" },
            },
            {
              name: "editorial_summary",
              type: "textarea",
              admin: { description: "Editorial summary from Google Places" },
            },
          ],
        },

        // Tab 5: Architecture
        {
          label: "Architecture",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "design_firm",
                  type: "text",
                  admin: { description: "Comma-separated design firm names" },
                },
                { name: "architectural_style", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "design_period", type: "text" },
                { name: "construction_year", type: "number" },
              ],
            },
            {
              name: "architectural_significance",
              type: "textarea",
              admin: { description: "Why this matters architecturally" },
            },
            {
              name: "design_story",
              type: "textarea",
              admin: { description: "Rich narrative about the design" },
            },
            {
              type: "row",
              fields: [
                { name: "architect_id", type: "text" },
                { name: "design_firm_id", type: "text" },
                { name: "interior_designer_id", type: "text" },
                { name: "movement_id", type: "text" },
              ],
            },
            { name: "architect_info_json", type: "json" },
            { name: "architect_info_updated_at", type: "text" },
            { name: "renovation_history", type: "json" },
            { name: "design_awards", type: "json" },
          ],
        },

        // Tab 6: Booking
        {
          label: "Booking",
          fields: [
            {
              type: "row",
              fields: [
                { name: "website", type: "text" },
                { name: "phone_number", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "instagram_handle", type: "text" },
                { name: "instagram_url", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "opentable_url", type: "text" },
                { name: "resy_url", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "booking_url", type: "text" },
                { name: "reservation_phone", type: "text" },
              ],
            },
          ],
        },

        // Tab 7: Data (mostly read-only enrichment data)
        {
          label: "Data",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "rating",
                  type: "number",
                  admin: { description: "Google Places rating" },
                },
                {
                  name: "price_level",
                  type: "number",
                  min: 1,
                  max: 4,
                  admin: { description: "1=Budget, 2=Moderate, 3=Expensive, 4=Very Expensive" },
                },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "views_count", type: "number" },
                { name: "saves_count", type: "number" },
                { name: "visits_count", type: "number" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "user_ratings_total", type: "number" },
                { name: "google_name", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "international_phone_number", type: "text" },
                { name: "last_enriched_at", type: "text" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "intelligence_score", type: "number" },
                { name: "web_content_updated_at", type: "text" },
              ],
            },
            { name: "place_types_json", type: "json" },
            { name: "opening_hours_json", type: "json" },
            { name: "reviews_json", type: "json" },
            { name: "web_content_json", type: "json" },
          ],
        },
      ],
    },
  ],
};
