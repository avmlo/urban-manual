import type { GlobalConfig } from "payload";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  admin: {
    group: "Settings",
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "siteName",
      type: "text",
      defaultValue: "Urban Manual",
      admin: { description: "Site name shown in metadata" },
    },
    {
      name: "siteDescription",
      type: "textarea",
      defaultValue: "Curated travel guide featuring 897+ destinations worldwide",
    },
    {
      name: "contactEmail",
      type: "email",
    },
    {
      name: "maintenanceMode",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Enable maintenance mode to show a maintenance page" },
    },
    {
      type: "group",
      name: "homepage",
      label: "Homepage Settings",
      fields: [
        {
          name: "heroTitle",
          type: "text",
          defaultValue: "Discover the world's best places",
        },
        {
          name: "heroSubtitle",
          type: "textarea",
        },
        {
          name: "featuredCities",
          type: "json",
          admin: { description: "JSON array of featured city slugs for the homepage" },
        },
      ],
    },
  ],
};
