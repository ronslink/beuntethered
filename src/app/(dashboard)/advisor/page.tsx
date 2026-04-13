import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import AIAdvisoryPage from "./_AIAdvisoryPage";

export default async function AdvisorPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");
  return <AIAdvisoryPage />;
}
