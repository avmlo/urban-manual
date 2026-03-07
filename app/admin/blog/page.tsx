"use client";

import { BlogCMS } from "@/features/admin/components/cms/blog/BlogCMS";

export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  return <BlogCMS />;
}
