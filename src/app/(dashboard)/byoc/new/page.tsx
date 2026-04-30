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
      invited_client_email: true,
      client_id: true,
      created_at: true,
      milestones: {
        select: { amount: true },
      },
      activity_logs: {
        orderBy: { created_at: "desc" },
        take: 8,
        select: { metadata: true },
      },
    },
  });

  const recentPackets = recentProjects.map((project) => {
    const totals = calculateBYOCInviteTotals(project.milestones.map((milestone) => ({ amount: Number(milestone.amount) })));
    const deliveryLog = project.activity_logs.find((log) => {
      const metadata = log.metadata;
      return metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as any).operation === "BYOC_INVITE_DELIVERY_RECORDED";
    });
    const deliveryMetadata =
      deliveryLog?.metadata && typeof deliveryLog.metadata === "object" && !Array.isArray(deliveryLog.metadata)
        ? (deliveryLog.metadata as Record<string, unknown>)
        : null;

    return {
      id: project.id,
      title: project.title,
      status: project.status,
      inviteToken: project.invite_token,
      clientEmail: project.invited_client_email,
      clientId: project.client_id,
      createdAt: project.created_at.toISOString(),
      clientTotalCents: totals.clientTotalCents,
      facilitatorPayoutCents: totals.facilitatorPayoutCents,
      delivery: deliveryMetadata
        ? {
            emailSent: deliveryMetadata.email_delivery_sent === true,
            emailSkipped: typeof deliveryMetadata.email_delivery_skipped === "string" ? deliveryMetadata.email_delivery_skipped : null,
            existingClientAccount: deliveryMetadata.existing_client_account === true,
            inAppNotificationSent: deliveryMetadata.in_app_notification_sent === true,
          }
        : null,
    };
  });

  return <BYOCDraftingHub recentPackets={recentPackets} />;
}
