import type { CollectionConfig } from "payload";

export const Brands: CollectionConfig = {
  slug: "brands",
  dbName: "brands",
  timestamps: false,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "website"],
    listSearchableFields: ["name", "category"],
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
    { name: "logo_url", type: "text", admin: { description: "Brand logo URL" } },
    { name: "website", type: "text" },
    { name: "description", type: "textarea" },
    {
      name: "category",
      type: "select",
      options: [
        "Luxury Hotel",
        "Upper Upscale Hotel",
        "Upscale Hotel",
        "Boutique Hotel",
        "Lifestyle Hotel",
        "Restaurant Group",
        "Hospitality Group",
        "Other",
      ],
    },
  ],
};
