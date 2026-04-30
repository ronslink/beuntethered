import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import BYOCDraftingHub from "./_BYOCDraftingHub";
import { prisma } from "@/lib/auth";
import { calculateBYOCInviteTotals } from "@/lib/byoc-sow";

/**
 * Bring Your Own Client — FACILITATOR only.
 * Facilitators use this to generate a SoW for an external client and
 * send them a 0% fee magic link invite to onboard onto the platform.
 */
export default async function BYOCPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") redirect("/dashboard");

  const recentProjects = await prisma.project.findMany({
    where: {
      creator_id: user.id,
      is_byoc: true,
    },
    orderBy: { created_at: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      invite_token: true,
      created_at: true,
      milestones: {
        select: { amount: true },
      },
    },
  });

  const recentPackets = recentProjects.map((project) => {
    const totals = calculateBYOCInviteTotals(project.milestones.map((milestone) => ({ amount: Number(milestone.amount) })));
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      inviteToken: project.invite_token,
      createdAt: project.created_at.toISOString(),
      clientTotalCents: totals.clientTotalCents,
      facilitatorPayoutCents: totals.facilitatorPayoutCents,
    };
  });

  return <BYOCDraftingHub recentPackets={recentPackets} />;
}
