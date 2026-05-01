import assert from "node:assert/strict";
import test from "node:test";
import {
  BYOC_CLIENT_FEE_RATE,
  FACILITATOR_PLATFORM_FEE_RATE,
  MARKETPLACE_CLIENT_FEE_RATE,
  calculateMilestoneFees,
  formatFeeRate,
  getFacilitatorFeeLabel,
  getPlatformFeeRate,
} from "../src/lib/platform-fees.ts";

test("calculates marketplace milestone fee and facilitator payout", () => {
  const fees = calculateMilestoneFees({ amount: 10_000, isByoc: false });

  assert.equal(fees.grossAmountCents, 1_000_000);
  assert.equal(fees.platformFeeCents, 80_000);
  assert.equal(fees.clientTotalCents, 1_080_000);
  assert.equal(fees.facilitatorPayoutCents, 1_000_000);
  assert.equal(fees.feeRate, 0.08);
});

test("calculates BYOC milestone fee", () => {
  const fees = calculateMilestoneFees({ amount: 10_000, isByoc: true });

  assert.equal(fees.platformFeeCents, 50_000);
  assert.equal(fees.clientTotalCents, 1_050_000);
  assert.equal(fees.facilitatorPayoutCents, 1_000_000);
  assert.equal(getPlatformFeeRate({ isByoc: true }), 0.05);
});

test("formats platform fee labels from centralized rates", () => {
  assert.equal(formatFeeRate(MARKETPLACE_CLIENT_FEE_RATE), "8%");
  assert.equal(formatFeeRate(BYOC_CLIENT_FEE_RATE), "5%");
  assert.equal(formatFeeRate(FACILITATOR_PLATFORM_FEE_RATE), "0%");
  assert.equal(getFacilitatorFeeLabel(), "0%");
});
