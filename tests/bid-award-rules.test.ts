import assert from "node:assert/strict";
import test from "node:test";
import { getFacilitatorAwardReadiness } from "../src/lib/bid-award-rules.ts";

test("blocks award when facilitator has no Stripe account", () => {
  const readiness = getFacilitatorAwardReadiness({
    stripe_account_id: null,
    verifications: [{ type: "STRIPE", status: "VERIFIED" }],
  });

  assert.equal(readiness.ok, false);
  if (!readiness.ok) {
    assert.equal(readiness.code, "FACILITATOR_STRIPE_REQUIRED");
  }
});

test("blocks award when Stripe payout verification is pending", () => {
  const readiness = getFacilitatorAwardReadiness({
    stripe_account_id: "acct_pending",
    verifications: [
      { type: "STRIPE", status: "PENDING" },
      { type: "IDENTITY", status: "VERIFIED" },
    ],
  });

  assert.equal(readiness.ok, false);
  if (!readiness.ok) {
    assert.equal(readiness.code, "FACILITATOR_PAYOUT_VERIFICATION_REQUIRED");
  }
});

test("blocks award when identity verification is pending", () => {
  const readiness = getFacilitatorAwardReadiness({
    stripe_account_id: "acct_verified",
    verifications: [
      { type: "STRIPE", status: "VERIFIED" },
      { type: "IDENTITY", status: "PENDING" },
    ],
  });

  assert.equal(readiness.ok, false);
  if (!readiness.ok) {
    assert.equal(readiness.code, "FACILITATOR_IDENTITY_VERIFICATION_REQUIRED");
  }
});

test("allows award when Stripe payout and identity verification are verified", () => {
  assert.deepEqual(getFacilitatorAwardReadiness({
    stripe_account_id: "acct_verified",
    verifications: [
      { type: "STRIPE", status: "VERIFIED" },
      { type: "IDENTITY", status: "VERIFIED" },
    ],
  }), { ok: true });
});
