import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import BYOCDraftingHub from "./_BYOCDraftingHub";

/**
 * Bring Your Own Client — FACILITATOR only.
 * Facilitators use this to generate a SoW for an external client and
 * send them a 0% fee magic link invite to onboard onto the platform.
 */
export default async function BYOCPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");
  return <BYOCDraftingHub />;
}
