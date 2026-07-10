import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/server/hub-auth";

export default async function SourcesPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/");
  }

  redirect("/admin");
}
