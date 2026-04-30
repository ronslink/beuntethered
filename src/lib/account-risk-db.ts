import type { AccountRiskSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/auth";
import type { RequestRiskFingerprint } from "@/lib/account-risk";

export async function recordAccountRiskSignal({
  eventType,
  severity,
  userId,
  counterpartyId,
  projectId,
  bidId,
  fingerprint,
  reason,
  metadata,
}: {
  eventType: "PROJECT_POSTED" | "DUPLICATE_SCOPE_REVIEW" | "BID_SUBMITTED" | "SELF_DEALING_REVIEW" | "AWARD_REVIEW";
  severity: AccountRiskSeverity;
  userId: string;
  counterpartyId?: string | null;
  projectId?: string | null;
  bidId?: string | null;
  fingerprint: RequestRiskFingerprint;
  reason: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.accountRiskSignal.create({
    data: {
      event_type: eventType,
      severity,
      user_id: userId,
      counterparty_id: counterpartyId ?? null,
      project_id: projectId ?? null,
      bid_id: bidId ?? null,
      hashed_ip: fingerprint.hashedIp,
      user_agent_hash: fingerprint.userAgentHash,
      reason,
      metadata,
    },
  });
}
