import assert from "node:assert/strict";
import test from "node:test";
import { buildBYOCSowSnapshot, calculateBYOCInviteTotals } from "../src/lib/byoc-sow.ts";

test("builds a BYOC SOW snapshot with milestones and trust terms", () => {
  const snapshot = buildBYOCSowSnapshot({
    title: "Billing Portal",
    executiveSummary: "Deliver a verified billing portal the buyer can open and test.",
    milestones: [
      {
        title: "Portal Release",
        description: "Deploy the billing portal with customer login and Stripe test-mode event evidence.",
        amount: 2000,
        estimated_duration_days: 7,
        deliverables: ["Working staging URL", "Source archive"],
        acceptance_criteria: ["Buyer can open the staging URL", "Stripe test event is recorded"],
      },
    ],
  });

  assert.match(snapshot, /Milestone Verification Schedule/);
  assert.match(snapshot, /Working staging URL/);
  assert.match(snapshot, /Stripe test event is recorded/);
  assert.match(snapshot, /0% marketplace fee/);
});

test("calculates BYOC invite totals with client fee and full facilitator payout", () => {
  const totals = calculateBYOCInviteTotals([{ amount: 1000 }, { amount: 500 }]);

  assert.equal(totals.grossAmountCents, 150000);
  assert.equal(totals.platformFeeCents, 7500);
  assert.equal(totals.clientTotalCents, 157500);
  assert.equal(totals.facilitatorPayoutCents, 150000);
});
