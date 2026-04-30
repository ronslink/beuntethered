import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/auth";

export async function recordActivity({
  projectId,
  actorId,
  milestoneId,
  bidId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  projectId: string;
  actorId?: string | null;
  milestoneId?: string | null;
  bidId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.activityLog.create({
    data: {
      project_id: projectId,
      actor_id: actorId ?? null,
      milestone_id: milestoneId ?? null,
      bid_id: bidId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    },
  });
}
