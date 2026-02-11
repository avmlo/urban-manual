import type { CollectionConfig } from "payload";
import { supabaseAuthStrategy } from "@/lib/auth/supabase-payload-strategy";

export const Admins: CollectionConfig = {
  slug: "admins",
  auth: {
    disableLocalStrategy: true,
    strategies: [
      {
        name: "supabase",
        authenticate: supabaseAuthStrategy,
      },
    ],
  },
  admin: {
    useAsTitle: "email",
    group: "System",
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "supabaseId",
      type: "text",
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: "Supabase Auth user ID (auto-synced)",
      },
    },
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      defaultValue: "admin",
      required: true,
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
    },
  ],
};
