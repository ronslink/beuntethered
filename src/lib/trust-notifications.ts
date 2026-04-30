import type { Prisma } from "@prisma/client";
import { createSystemNotification } from "./notifications.ts";
import {
  buildTrustNotificationCopy,
  type TrustNotificationKind,
} from "./trust-notification-copy.ts";

export { buildTrustNotificationCopy };
export type { TrustNotificationKind };

export async function notifyTrustEvent({
  userId,
  kind,
  projectId,
  projectTitle,
  actorRole,
  milestoneId,
  disputeId,
  auditPassed,
  standing,
  metadata,
}: {
  userId?: string | null;
  kind: TrustNotificationKind;
  projectId: string;
  projectTitle: string;
  actorRole?: "CLIENT" | "FACILITATOR" | "SYSTEM";
  milestoneId?: string | null;
  disputeId?: string | null;
  auditPassed?: boolean | null;
  standing?: "CLIENT" | "FACILITATOR";
  metadata?: Prisma.InputJsonValue;
}) {
  if (!userId) return null;

  const copy = buildTrustNotificationCopy({
    kind,
    projectTitle,
    actorRole,
    auditPassed,
    standing,
  });

  return createSystemNotification({
    userId,
    message: copy.message,
    type: copy.type,
    href: `/command-center/${projectId}`,
    sourceKey: ["trust", kind, projectId, milestoneId, disputeId, userId].filter(Boolean).join("_"),
    metadata,
  });
}
