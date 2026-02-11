import type { CollectionConfig } from "payload";

export const Cities: CollectionConfig = {
  slug: "cities",
  dbName: "cities",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "region"],
    listSearchableFields: ["name", "country"],
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
    { name: "country", type: "text" },
    { name: "region", type: "text" },
    { name: "image_url", type: "text", admin: { description: "City image URL" } },
    { name: "description", type: "textarea" },
  ],
};
