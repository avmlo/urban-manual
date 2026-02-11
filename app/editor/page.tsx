import { redirect } from "next/navigation";

// Homepage visual editor has been migrated to Payload CMS admin
export default function EditorPage() {
  redirect("/admin");
}
