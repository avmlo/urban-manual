import type { CollectionConfig } from "payload";

export const Neighborhoods: CollectionConfig = {
  slug: "neighborhoods",
  dbName: "neighborhoods",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "city", "country"],
    listSearchableFields: ["name", "city", "country"],
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
        return data;
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "city", type: "text" },
    { name: "country", type: "text" },
    { name: "description", type: "textarea" },
    { name: "image_url", type: "text", admin: { description: "Neighborhood image URL" } },
  ],
};
