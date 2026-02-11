import type { CollectionConfig } from "payload";

export const Architects: CollectionConfig = {
  slug: "architects",
  dbName: "architects",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "nationality", "birth_year"],
    listSearchableFields: ["name", "nationality"],
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
    { name: "bio", type: "textarea" },
    {
      type: "row",
      fields: [
        { name: "birth_year", type: "number" },
        { name: "death_year", type: "number" },
      ],
    },
    { name: "nationality", type: "text" },
    { name: "design_philosophy", type: "textarea" },
    {
      name: "notable_works",
      type: "json",
      admin: { description: "Array of notable works" },
    },
    {
      name: "movements",
      type: "json",
      admin: { description: "Array of architectural movement slugs" },
    },
    { name: "image_url", type: "text", admin: { description: "Architect/designer photo URL" } },
  ],
};
