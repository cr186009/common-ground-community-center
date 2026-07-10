import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/server/hub-auth";

export default async function AdminSourcesPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin?error=auth");
  }

  redirect("/admin");
}
