import assert from "node:assert/strict";
import test from "node:test";
import { buildVerificationOperationsSummary } from "../src/lib/verification-operations.ts";

test("builds verification operations summary from grouped counts", () => {
  const summary = buildVerificationOperationsSummary({
    facilitatorCount: 10,
    awardEligibleFacilitators: 4,
    verificationCounts: [
      { type: "PORTFOLIO", status: "PENDING", count: 2 },
      { type: "PORTFOLIO", status: "REJECTED", count: 1 },
      { type: "BUSINESS", status: "PENDING", count: 3 },
      { type: "STRIPE", status: "PENDING", count: 5 },
      { type: "STRIPE", status: "VERIFIED", count: 4 },
      { type: "IDENTITY", status: "REJECTED", count: 2 },
      { type: "IDENTITY", status: "VERIFIED", count: 4 },
    ],
  });

  assert.equal(summary.manualQueue, 6);
  assert.equal(summary.portfolioQueue, 3);
  assert.equal(summary.businessQueue, 3);
  assert.equal(summary.providerPending, 5);
  assert.equal(summary.providerRejected, 2);
  assert.equal(summary.stripe.VERIFIED, 4);
  assert.equal(summary.identity.REJECTED, 2);
  assert.equal(summary.awardEligibleFacilitators, 4);
  assert.equal(summary.facilitatorCount, 10);
});

test("defaults missing verification statuses to zero", () => {
  const summary = buildVerificationOperationsSummary({
    facilitatorCount: 0,
    awardEligibleFacilitators: 0,
    verificationCounts: [],
  });

  assert.deepEqual(summary.stripe, { PENDING: 0, VERIFIED: 0, REJECTED: 0 });
  assert.deepEqual(summary.identity, { PENDING: 0, VERIFIED: 0, REJECTED: 0 });
  assert.equal(summary.manualQueue, 0);
});
