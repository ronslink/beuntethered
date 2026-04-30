import assert from "node:assert/strict";
import test from "node:test";
import {
  assessMilestoneQuality,
  normalizeGeneratedMilestone,
  normalizeMilestoneForStorage,
} from "../src/lib/milestone-quality.ts";

const strongMilestone = {
  title: "Billing Portal",
  description: "Build a customer billing portal where account owners can manage subscriptions, review invoices, and see payment state.",
  deliverables: ["Customer billing dashboard", "Stripe checkout and billing flow", "Invoice history screen"],
  acceptance_criteria: [
    "Client can open the billing dashboard and see current subscription state.",
    "Stripe webhook events record successful payment updates in the project activity log.",
    "Source archive includes setup notes and environment configuration evidence.",
  ],
  estimated_duration_days: 10,
  amount: 2500,
};

test("normalizes process-only deliverables into tangible outputs", () => {
  const normalized = normalizeGeneratedMilestone({
    title: "Payment Flow",
    description: "Build the Stripe checkout flow and payment status handling for buyer review.",
    deliverables: ["Testing and bug fixes"],
    acceptance_criteria: "Client can complete checkout in a preview environment.",
    estimated_duration_days: 7,
    amount: 1200,
  });

  assert.equal(normalized.deliverables.some((deliverable) => /testing|bug fix/i.test(deliverable)), false);
  assert.ok(normalized.deliverables.length >= 2);
  assert.match(normalized.acceptance_criteria, /Client can/i);
});

test("rejects milestones that are only process work", () => {
  const quality = assessMilestoneQuality({
    title: "Testing and bug fixes",
    description: "Run testing and fix bugs before approval.",
    deliverables: ["Testing and bug fixes"],
    acceptance_criteria: ["Test it"],
    estimated_duration_days: 5,
    amount: 500,
  });

  assert.equal(quality.passes, false);
  assert.ok(quality.blockingIssues.some((issue) => issue.includes("process-only")));
});

test("rejects generic development and launch phase names", () => {
  const quality = assessMilestoneQuality({
    title: "Development & Launch",
    description: "Build the approved designs and launch them for buyer review.",
    deliverables: ["Responsive website build", "Contact form integration", "Hosting handoff notes"],
    acceptance_criteria: [
      "Client can open the responsive website in a preview environment.",
      "Contact form submissions are recorded with test evidence.",
    ],
    estimated_duration_days: 10,
    amount: 1800,
  });

  assert.equal(quality.passes, false);
  assert.ok(quality.blockingIssues.some((issue) => issue.includes("generic phase name")));
});

test("accepts QA as evidence when attached to a tangible release", () => {
  const quality = assessMilestoneQuality({
    title: "Payment Checkout Flow",
    description: "Build a checkout flow where buyers can fund a milestone and see the payment state update after Stripe confirmation.",
    deliverables: ["Stripe checkout flow", "Payment status screen", "Payment webhook event records"],
    acceptance_criteria: [
      "Buyer can complete checkout in staging and see the milestone marked funded.",
      "QA report includes successful payment, failed payment, and webhook event evidence.",
    ],
    estimated_duration_days: 8,
    amount: 2200,
  });

  assert.equal(quality.passes, true);
});

test("requires at least one explicit proof artifact in acceptance criteria", () => {
  const quality = assessMilestoneQuality({
    title: "User Profile Flow",
    description: "Build a user profile flow where account owners can edit personal details and save preference changes.",
    deliverables: ["Profile settings screen", "Preference update flow", "Saved profile activity record"],
    acceptance_criteria: [
      "User can update their name and see the saved value after refresh.",
      "User can change notification preferences and the settings remain available after logout.",
    ],
    estimated_duration_days: 6,
    amount: 1400,
  });

  assert.equal(quality.passes, false);
  assert.ok(quality.blockingIssues.some((issue) => issue.includes("proof artifact")));
});

test("accepts meaningful, realistic, actionable, verifiable milestones", () => {
  const quality = assessMilestoneQuality(strongMilestone);

  assert.equal(quality.passes, true);
  assert.equal(quality.blockingIssues.length, 0);
  assert.ok(quality.score >= 90);
});

test("normalizes milestones into storage-ready arrays", () => {
  const normalized = normalizeMilestoneForStorage(strongMilestone);

  assert.equal(Array.isArray(normalized.acceptance_criteria), true);
  assert.ok(normalized.acceptance_criteria.length >= 2);
  assert.deepEqual(normalized.deliverables.slice(0, 2), ["Customer billing dashboard", "Stripe checkout and billing flow"]);
});
