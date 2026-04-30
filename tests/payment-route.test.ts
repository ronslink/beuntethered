import assert from "node:assert/strict";
import test from "node:test";
import {
  getPendingCheckoutBlock,
  getPaymentRecordClientId,
  validateFacilitatorPayoutReadiness,
  validateMilestoneFundingReadiness,
} from "../src/lib/payment-route-rules.ts";

test("funding readiness requires pending assigned milestones", () => {
  assert.deepEqual(validateMilestoneFundingReadiness({
    status: "PENDING",
    facilitator_id: "facilitator_1",
  }), { ok: true });

  const unassigned = validateMilestoneFundingReadiness({
    status: "PENDING",
    facilitator_id: null,
  });
  assert.equal(unassigned.ok, false);
  if (!unassigned.ok) {
    assert.equal(unassigned.code, "MILESTONE_UNASSIGNED");
    assert.equal(unassigned.status, 409);
  }

  const funded = validateMilestoneFundingReadiness({
    status: "FUNDED_IN_ESCROW",
    facilitator_id: "facilitator_1",
  });
  assert.equal(funded.ok, false);
  if (!funded.ok) {
    assert.equal(funded.code, "MILESTONE_NOT_FUNDABLE");
    assert.equal(funded.status, 409);
  }
});

test("payout readiness requires facilitator Stripe onboarding", () => {
  const ready = validateFacilitatorPayoutReadiness({
    facilitator: {
      stripe_account_id: "acct_ready",
      verifications: [
        { type: "STRIPE", status: "VERIFIED" },
        { type: "IDENTITY", status: "VERIFIED" },
      ],
    },
  });
  assert.deepEqual(ready, { ok: true, stripeAccountId: "acct_ready" });

  const incomplete = validateFacilitatorPayoutReadiness({
    facilitator: { stripe_account_id: null },
  });
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) {
    assert.equal(incomplete.code, "FACILITATOR_PAYOUT_NOT_READY");
    assert.equal(incomplete.status, 409);
  }

  const unverified = validateFacilitatorPayoutReadiness({
    facilitator: {
      stripe_account_id: "acct_pending",
      verifications: [
        { type: "STRIPE", status: "PENDING" },
        { type: "IDENTITY", status: "VERIFIED" },
      ],
    },
  });
  assert.equal(unverified.ok, false);
  if (!unverified.ok) {
    assert.equal(unverified.code, "FACILITATOR_PAYOUT_NOT_VERIFIED");
    assert.equal(unverified.status, 409);
  }

  const identityPending = validateFacilitatorPayoutReadiness({
    facilitator: {
      stripe_account_id: "acct_ready",
      verifications: [
        { type: "STRIPE", status: "VERIFIED" },
        { type: "IDENTITY", status: "PENDING" },
      ],
    },
  });
  assert.equal(identityPending.ok, false);
  if (!identityPending.ok) {
    assert.equal(identityPending.code, "FACILITATOR_IDENTITY_NOT_VERIFIED");
    assert.equal(identityPending.status, 409);
  }
});

test("payment records prefer project client identity over acting workspace admin", () => {
  assert.equal(getPaymentRecordClientId({
    projectClientId: "owner_1",
    actorId: "admin_1",
  }), "owner_1");

  assert.equal(getPaymentRecordClientId({
    projectClientId: null,
    actorId: "admin_1",
  }), "admin_1");
});

test("pending checkout guard blocks only recent active sessions", () => {
  const now = new Date("2026-04-29T12:00:00.000Z");
  const recent = getPendingCheckoutBlock({
    now,
    pendingFundingRecord: {
      status: "PENDING",
      stripe_checkout_session_id: "cs_recent",
      updated_at: new Date("2026-04-29T11:58:00.000Z"),
    },
  });
  assert.equal(recent.blocked, true);
  if (recent.blocked) {
    assert.equal(recent.code, "CHECKOUT_ALREADY_STARTED");
    assert.equal(recent.status, 409);
  }

  assert.deepEqual(getPendingCheckoutBlock({
    now,
    pendingFundingRecord: {
      status: "PENDING",
      stripe_checkout_session_id: "cs_old",
      updated_at: new Date("2026-04-29T11:00:00.000Z"),
    },
  }), { blocked: false });

  assert.deepEqual(getPendingCheckoutBlock({
    now,
    pendingFundingRecord: {
      status: "CANCELLED",
      stripe_checkout_session_id: "cs_cancelled",
      updated_at: new Date("2026-04-29T11:59:00.000Z"),
    },
  }), { blocked: false });
});
