import type { CollectionConfig } from "payload";

export const Countries: CollectionConfig = {
  slug: "countries",
  dbName: "countries",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "code", "flag_emoji"],
    listSearchableFields: ["name", "code"],
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
    {
      name: "code",
      type: "text",
      admin: { description: "ISO 2-letter country code (e.g. US, GB, JP)" },
    },
    { name: "flag_emoji", type: "text" },
    { name: "image_url", type: "text", admin: { description: "Country image URL" } },
  ],
};
