import { calculateMilestoneFees, type FeeBreakdown } from "./platform-fees.ts";

export type WalletLedgerPaymentRecord = {
  kind: string;
  status: string;
  platform_fee_cents: number;
  facilitator_payout_cents: number;
  created_at: Date;
};

export type WalletFundingMilestone = {
  status: string;
  amount: number | string | { toString(): string } | null;
  project?: {
    is_byoc?: boolean | null;
  } | null;
};

export type WalletFundingForecast = {
  milestoneCount: number;
  marketplaceMilestoneCount: number;
  byocMilestoneCount: number;
  escrowAmountCents: number;
  platformFeeCents: number;
  clientTotalCents: number;
};

export type WalletEscrowStatusKey = "pendingFunding" | "fundedEscrow" | "submittedReview" | "paidReleased" | "disputed";

export type WalletEscrowBucket = {
  count: number;
  amountCents: number;
};

export type WalletEscrowSummary = Record<WalletEscrowStatusKey, WalletEscrowBucket> & {
  activeEscrowCents: number;
  totalTrackedCents: number;
};

export type WalletMilestoneActionRole = "CLIENT" | "FACILITATOR";

export type WalletMilestoneAction = {
  label: string;
  href: string;
};

export function getLatestLedgerPaymentRecord<T extends WalletLedgerPaymentRecord>(
  records: T[] | undefined,
  kind?: string
): T | null {
  const filtered = kind ? (records ?? []).filter((record) => record.kind === kind) : records ?? [];
  return [...filtered].sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;
}

export function isSucceededFundingRecord(record: WalletLedgerPaymentRecord) {
  return record.kind === "MILESTONE_FUNDING" && record.status === "SUCCEEDED";
}

export function isSucceededReleaseRecord(record: WalletLedgerPaymentRecord) {
  return record.kind === "ESCROW_RELEASE" && record.status === "SUCCEEDED";
}

export function sumSucceededClientFundingFeesCents(records: WalletLedgerPaymentRecord[]) {
  return records
    .filter(isSucceededFundingRecord)
    .reduce((sum, record) => sum + record.platform_fee_cents, 0);
}

export function sumSucceededFacilitatorPayoutCents(records: WalletLedgerPaymentRecord[]) {
  return records
    .filter(isSucceededReleaseRecord)
    .reduce((sum, record) => sum + record.facilitator_payout_cents, 0);
}

function amountAsNumber(amount: WalletFundingMilestone["amount"]) {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountAsCents(amount: WalletFundingMilestone["amount"]) {
  return Math.round(amountAsNumber(amount) * 100);
}

export function getPendingMilestoneFundingBreakdown(milestone: WalletFundingMilestone): FeeBreakdown | null {
  if (milestone.status !== "PENDING") return null;

  return calculateMilestoneFees({
    amount: amountAsNumber(milestone.amount),
    isByoc: milestone.project?.is_byoc === true,
  });
}

export function summarizePendingClientFunding(milestones: WalletFundingMilestone[]): WalletFundingForecast {
  return milestones.reduce<WalletFundingForecast>(
    (forecast, milestone) => {
      const breakdown = getPendingMilestoneFundingBreakdown(milestone);
      if (!breakdown) return forecast;

      return {
        milestoneCount: forecast.milestoneCount + 1,
        marketplaceMilestoneCount: forecast.marketplaceMilestoneCount + (milestone.project?.is_byoc ? 0 : 1),
        byocMilestoneCount: forecast.byocMilestoneCount + (milestone.project?.is_byoc ? 1 : 0),
        escrowAmountCents: forecast.escrowAmountCents + breakdown.grossAmountCents,
        platformFeeCents: forecast.platformFeeCents + breakdown.platformFeeCents,
        clientTotalCents: forecast.clientTotalCents + breakdown.clientTotalCents,
      };
    },
    {
      milestoneCount: 0,
      marketplaceMilestoneCount: 0,
      byocMilestoneCount: 0,
      escrowAmountCents: 0,
      platformFeeCents: 0,
      clientTotalCents: 0,
    }
  );
}

export function summarizeWalletEscrowStates(milestones: WalletFundingMilestone[]): WalletEscrowSummary {
  const summary: WalletEscrowSummary = {
    pendingFunding: { count: 0, amountCents: 0 },
    fundedEscrow: { count: 0, amountCents: 0 },
    submittedReview: { count: 0, amountCents: 0 },
    paidReleased: { count: 0, amountCents: 0 },
    disputed: { count: 0, amountCents: 0 },
    activeEscrowCents: 0,
    totalTrackedCents: 0,
  };

  for (const milestone of milestones) {
    const amountCents = amountAsCents(milestone.amount);
    const bucket =
      milestone.status === "PENDING"
        ? summary.pendingFunding
        : milestone.status === "FUNDED_IN_ESCROW"
        ? summary.fundedEscrow
        : milestone.status === "SUBMITTED_FOR_REVIEW"
        ? summary.submittedReview
        : milestone.status === "APPROVED_AND_PAID"
        ? summary.paidReleased
        : milestone.status === "DISPUTED"
        ? summary.disputed
        : null;

    if (!bucket) continue;

    bucket.count += 1;
    bucket.amountCents += amountCents;
    summary.totalTrackedCents += amountCents;
  }

  summary.activeEscrowCents = summary.fundedEscrow.amountCents + summary.submittedReview.amountCents;

  return summary;
}

export function getWalletMilestoneAction({
  role,
  projectId,
  milestoneId,
  status,
}: {
  role: WalletMilestoneActionRole;
  projectId: string;
  milestoneId: string;
  status: string;
}): WalletMilestoneAction | null {
  const href = `/command-center/${projectId}?tab=war-room#milestone-${milestoneId}`;

  if (role === "CLIENT") {
    if (status === "PENDING") return { label: "Fund milestone", href };
    if (status === "SUBMITTED_FOR_REVIEW") return { label: "Review submitted work", href };
    if (status === "DISPUTED") return { label: "Resolve dispute", href };
    return null;
  }

  if (status === "FUNDED_IN_ESCROW") return { label: "Submit delivery evidence", href };
  if (status === "SUBMITTED_FOR_REVIEW") return { label: "Awaiting client review", href };
  if (status === "DISPUTED") return { label: "Review dispute", href };
  return null;
}
