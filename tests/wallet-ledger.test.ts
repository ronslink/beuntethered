import assert from "node:assert/strict";
import test from "node:test";
import {
  getLatestLedgerPaymentRecord,
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
