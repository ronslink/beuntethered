import assert from "node:assert/strict";
import test from "node:test";
import {
  getPendingMilestoneFundingBreakdown,
  getLatestLedgerPaymentRecord,
  summarizePendingClientFunding,
  summarizeWalletEscrowStates,
  sumSucceededClientFundingFeesCents,
  sumSucceededFacilitatorPayoutCents,
  type WalletLedgerPaymentRecord,
} from "../src/lib/wallet-ledger.ts";

function record(overrides: Partial<WalletLedgerPaymentRecord>): WalletLedgerPaymentRecord {
  return {
    kind: "MILESTONE_FUNDING",
    status: "SUCCEEDED",
    platform_fee_cents: 0,
    facilitator_payout_cents: 0,
    created_at: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("wallet ledger only counts succeeded funding fees", () => {
  const records = [
    record({ status: "SUCCEEDED", platform_fee_cents: 1200 }),
    record({ status: "PENDING", platform_fee_cents: 900 }),
    record({ status: "FAILED", platform_fee_cents: 700 }),
    record({ status: "CANCELLED", platform_fee_cents: 500 }),
    record({ kind: "ESCROW_RELEASE", status: "SUCCEEDED", platform_fee_cents: 1200 }),
  ];

  assert.equal(sumSucceededClientFundingFeesCents(records), 1200);
});

test("wallet ledger only counts succeeded release payouts", () => {
  const records = [
    record({ kind: "ESCROW_RELEASE", status: "SUCCEEDED", facilitator_payout_cents: 10000 }),
    record({ kind: "ESCROW_RELEASE", status: "PENDING", facilitator_payout_cents: 6000 }),
    record({ kind: "MILESTONE_FUNDING", status: "SUCCEEDED", facilitator_payout_cents: 10000 }),
  ];

  assert.equal(sumSucceededFacilitatorPayoutCents(records), 10000);
});

test("latest wallet ledger record does not mutate the source order", () => {
  const first = record({ created_at: new Date("2026-04-01T00:00:00.000Z") });
  const latest = record({ created_at: new Date("2026-04-03T00:00:00.000Z") });
  const records = [first, latest];

  assert.equal(getLatestLedgerPaymentRecord(records)?.created_at.toISOString(), "2026-04-03T00:00:00.000Z");
  assert.deepEqual(records, [first, latest]);
});

test("wallet funding forecast separates escrow, client fee, and total due", () => {
  const forecast = summarizePendingClientFunding([
    { status: "PENDING", amount: 1000, project: { is_byoc: false } },
    { status: "PENDING", amount: 2000, project: { is_byoc: true } },
    { status: "FUNDED_IN_ESCROW", amount: 5000, project: { is_byoc: false } },
  ]);

  assert.deepEqual(forecast, {
    milestoneCount: 2,
    marketplaceMilestoneCount: 1,
    byocMilestoneCount: 1,
    escrowAmountCents: 300000,
    platformFeeCents: 18000,
    clientTotalCents: 318000,
  });
});

test("pending milestone funding breakdown uses the correct fee model", () => {
  assert.equal(
    getPendingMilestoneFundingBreakdown({ status: "PENDING", amount: 1000, project: { is_byoc: false } })?.clientTotalCents,
    108000
  );
  assert.equal(
    getPendingMilestoneFundingBreakdown({ status: "PENDING", amount: 1000, project: { is_byoc: true } })?.clientTotalCents,
    105000
  );
  assert.equal(
    getPendingMilestoneFundingBreakdown({ status: "FUNDED_IN_ESCROW", amount: 1000, project: { is_byoc: false } }),
    null
  );
});

test("wallet escrow summary buckets milestone states by operational meaning", () => {
  const summary = summarizeWalletEscrowStates([
    { status: "PENDING", amount: 1000 },
    { status: "FUNDED_IN_ESCROW", amount: 2000 },
    { status: "SUBMITTED_FOR_REVIEW", amount: 3000 },
    { status: "APPROVED_AND_PAID", amount: 4000 },
    { status: "DISPUTED", amount: 500 },
    { status: "CANCELLED", amount: 999 },
  ]);

  assert.deepEqual(summary, {
    pendingFunding: { count: 1, amountCents: 100000 },
    fundedEscrow: { count: 1, amountCents: 200000 },
    submittedReview: { count: 1, amountCents: 300000 },
    paidReleased: { count: 1, amountCents: 400000 },
    disputed: { count: 1, amountCents: 50000 },
    activeEscrowCents: 500000,
    totalTrackedCents: 1050000,
  });
});
