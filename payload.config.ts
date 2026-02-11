import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

import { Admins } from "./collections/Admins";
import { Destinations } from "./collections/Destinations";
import { Cities } from "./collections/Cities";
import { Countries } from "./collections/Countries";
import { Neighborhoods } from "./collections/Neighborhoods";
import { Brands } from "./collections/Brands";
import { Architects } from "./collections/Architects";
import { SiteSettings } from "./globals/SiteSettings";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "REPLACE_WITH_SECURE_SECRET",

  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || "",
      ssl: {
        rejectUnauthorized: false,
      },
    },
    push: true,
    disableCreateDatabase: true,
    idType: "serial",
    migrationDir: "./payload-migrations",
  }),

  editor: lexicalEditor(),

  collections: [
    Admins,
    Destinations,
    Cities,
    Countries,
    Neighborhoods,
    Brands,
    Architects,
  ],

  globals: [SiteSettings],

  admin: {
    user: "admins",
    meta: {
      titleSuffix: " - Urban Manual",
    },
    components: {
      views: {
        enrichment: {
          Component: "/payload-views/EnrichmentView",
          path: "/enrichment",
        },
        analyticsView: {
          Component: "/payload-views/AnalyticsView",
          path: "/analytics-view",
        },
        userManagement: {
          Component: "/payload-views/UserManagementView",
          path: "/user-management",
        },
        reindex: {
          Component: "/payload-views/ReindexView",
          path: "/reindex",
        },
        discover: {
          Component: "/payload-views/DiscoverView",
          path: "/discover",
        },
        settingsView: {
          Component: "/payload-views/SettingsView",
          path: "/settings-view",
        },
      },
      beforeDashboard: ["/payload-views/DashboardView"],
      afterNavLinks: ["/payload-views/CustomNavLinks"],
      beforeLogin: ["/payload-views/LoginView"],
    },
  },

  sharp,

  typescript: {
    outputFile: "./types/payload-types.ts",
  },
});
