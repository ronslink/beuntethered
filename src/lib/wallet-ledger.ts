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
