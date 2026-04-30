import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ProposalAdvisorPage from "./_ProposalAdvisorPage";

export default async function AdvisorPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");
  return <ProposalAdvisorPage userId={user.id} />;
}
