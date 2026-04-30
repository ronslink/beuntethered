import type { NotificationType } from "@prisma/client";

export type TrustNotificationKind =
  | "MILESTONE_SUBMITTED"
  | "AUDIT_COMPLETED"
  | "ESCROW_RELEASED"
  | "DISPUTE_RESOLVED";

export function buildTrustNotificationCopy({
  kind,
  projectTitle,
  actorRole,
  auditPassed,
  standing,
}: {
  kind: TrustNotificationKind;
  projectTitle: string;
  actorRole?: "CLIENT" | "FACILITATOR" | "SYSTEM";
  auditPassed?: boolean | null;
  standing?: "CLIENT" | "FACILITATOR";
}): { message: string; type: NotificationType } {
  if (kind === "MILESTONE_SUBMITTED") {
    return {
      message: `A milestone is ready for review on "${projectTitle}".`,
      type: "MILESTONE",
    };
  }

  if (kind === "AUDIT_COMPLETED") {
    return {
      message: `Delivery audit ${auditPassed ? "passed" : "needs review"} on "${projectTitle}".`,
      type: auditPassed ? "SUCCESS" : "WARNING",
    };
  }

  if (kind === "ESCROW_RELEASED") {
    return {
      message:
        actorRole === "CLIENT"
          ? `Escrow was released on "${projectTitle}".`
          : `Payment was released to you for "${projectTitle}".`,
      type: "SUCCESS",
    };
  }

  return {
    message:
      standing === "CLIENT"
        ? `Dispute resolved in favor of the client on "${projectTitle}".`
        : `Dispute resolved in favor of the facilitator on "${projectTitle}".`,
    type: standing === "CLIENT" ? "WARNING" : "SUCCESS",
  };
}
