import type { VerificationStatus, VerificationType } from "@prisma/client";

export type VerificationCountRow = {
  type: VerificationType;
  status: VerificationStatus;
  count: number;
};

export type VerificationOperationsSummary = {
  manualQueue: number;
  portfolioQueue: number;
  businessQueue: number;
  providerPending: number;
  providerRejected: number;
  stripe: Record<VerificationStatus, number>;
  identity: Record<VerificationStatus, number>;
  awardEligibleFacilitators: number;
  facilitatorCount: number;
};

const EMPTY_STATUS_COUNTS: Record<VerificationStatus, number> = {
  PENDING: 0,
  VERIFIED: 0,
  REJECTED: 0,
};

function statusCounts(rows: VerificationCountRow[], type: VerificationType) {
  return rows
    .filter((row) => row.type === type)
    .reduce<Record<VerificationStatus, number>>(
      (acc, row) => {
        acc[row.status] += row.count;
        return acc;
      },
      { ...EMPTY_STATUS_COUNTS }
    );
}

function manualQueueCount(rows: VerificationCountRow[], type: "PORTFOLIO" | "BUSINESS") {
  return rows
    .filter((row) => row.type === type && row.status !== "VERIFIED")
    .reduce((sum, row) => sum + row.count, 0);
}

export function buildVerificationOperationsSummary({
  verificationCounts,
  facilitatorCount,
  awardEligibleFacilitators,
}: {
  verificationCounts: VerificationCountRow[];
  facilitatorCount: number;
  awardEligibleFacilitators: number;
}): VerificationOperationsSummary {
  const stripe = statusCounts(verificationCounts, "STRIPE");
  const identity = statusCounts(verificationCounts, "IDENTITY");
  const portfolioQueue = manualQueueCount(verificationCounts, "PORTFOLIO");
  const businessQueue = manualQueueCount(verificationCounts, "BUSINESS");

  return {
    manualQueue: portfolioQueue + businessQueue,
    portfolioQueue,
    businessQueue,
    providerPending: stripe.PENDING + identity.PENDING,
    providerRejected: stripe.REJECTED + identity.REJECTED,
    stripe,
    identity,
    awardEligibleFacilitators,
    facilitatorCount,
  };
}
