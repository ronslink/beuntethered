import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArbitrationResolutionMetadata,
  getArbitrationPaymentKeys,
  getArbitrationStatusError,
} from "../src/lib/arbitration-resolution.ts";

test("builds stable arbitration payment idempotency keys", () => {
  assert.deepEqual(getArbitrationPaymentKeys("milestone_1"), {
    refundRecordKey: "refund_milestone_1",
    refundStripeIdempotencyKey: "refund_milestone_1",
    releaseRecordKey: "release_milestone_1",
    releaseStripeIdempotencyKey: "release_escrow_milestone_1",
  });
});

test("only disputed milestones can be resolved by arbitration", () => {
  assert.equal(getArbitrationStatusError("DISPUTED", "CLIENT"), null);
  assert.equal(
    getArbitrationStatusError("SUBMITTED_FOR_REVIEW", "CLIENT"),
    "Only disputed milestones can be refunded through arbitration."
  );
  assert.equal(
    getArbitrationStatusError("FUNDED_IN_ESCROW", "FACILITATOR"),
    "Only disputed milestones can be released through arbitration."
  );
});

test("builds auditable arbitration metadata for refund and release outcomes", () => {
  const refund = buildArbitrationResolutionMetadata({
    standing: "CLIENT",
    disputeId: "dispute_1",
    arbiterId: "admin_1",
    stripeId: "re_123",
    platformFeeCents: 33600,
    counterpartyAmountCents: 453600,
    latestAuditScore: 64,
    latestAuditPassing: false,
  });

  assert.equal(refund.operation, "ARBITRATION_REFUND");
  assert.equal("stripe_refund_id" in refund ? refund.stripe_refund_id : null, "re_123");
  assert.equal("client_refund_cents" in refund ? refund.client_refund_cents : null, 453600);
  assert.equal(refund.latest_audit_passing, false);

  const release = buildArbitrationResolutionMetadata({
    standing: "FACILITATOR",
    disputeId: "dispute_1",
    arbiterId: "admin_1",
    stripeId: "tr_123",
    platformFeeCents: 33600,
    counterpartyAmountCents: 420000,
    latestAuditScore: 94,
    latestAuditPassing: true,
  });

  assert.equal(release.operation, "ARBITRATION_RELEASE");
  assert.equal("stripe_transfer_id" in release ? release.stripe_transfer_id : null, "tr_123");
  assert.equal("facilitator_payout_cents" in release ? release.facilitator_payout_cents : null, 420000);
  assert.equal(release.latest_audit_score, 94);
});
