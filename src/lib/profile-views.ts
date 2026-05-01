import type { Role } from "@prisma/client";
import { prisma } from "@/lib/auth";
import { getProfileViewDeduplicationStart, shouldRecordProfileView } from "./profile-view-rules.ts";

export async function recordFacilitatorProfileView({
  facilitatorId,
  viewerId,
  viewerRole,
  now = new Date(),
}: {
  facilitatorId: string;
  viewerId?: string | null;
  viewerRole?: Role | null;
  now?: Date;
}) {
  if (!shouldRecordProfileView({ facilitatorId, viewerId, viewerRole })) {
    return { recorded: false as const, reason: "not_recordable" as const };
  }

  const existingView = await prisma.profileView.findFirst({
    where: {
      facilitator_id: facilitatorId,
      viewer_id: viewerId,
      created_at: { gte: getProfileViewDeduplicationStart(now) },
    },
    select: { id: true },
  });

  if (existingView) {
    return { recorded: false as const, reason: "already_recorded_today" as const };
  }

  const view = await prisma.profileView.create({
    data: {
      facilitator_id: facilitatorId,
      viewer_id: viewerId,
      viewer_role: viewerRole,
    },
    select: { id: true },
  });

  return { recorded: true as const, id: view.id };
}
