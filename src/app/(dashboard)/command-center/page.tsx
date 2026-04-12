import { redirect } from "next/navigation";

/**
 * Legacy command-center route — redirects to the new dynamic route.
 * All project-specific command center pages are now at /command-center/[id].
 */
export default async function CommandCenter({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const { id, tab } = await searchParams;
  if (!id) redirect("/dashboard");

  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  const query = params.toString();

  redirect(`/command-center/${id}${query ? `?${query}` : ""}`);
}
