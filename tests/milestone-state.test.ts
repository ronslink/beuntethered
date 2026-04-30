import assert from "node:assert/strict";
import test from "node:test";
import {
  canFundMilestone,
  canRefundMilestone,
  canReleaseMilestone,
  canSubmitMilestone,
  shouldApplyFundingEvent,
} from "../src/lib/milestone-state.ts";

test("only pending milestones can receive funding events", () => {
  assert.equal(canFundMilestone("PENDING"), true);
  assert.equal(canFundMilestone("FUNDED_IN_ESCROW"), false);
  assert.equal(canFundMilestone("SUBMITTED_FOR_REVIEW"), false);
  assert.equal(canFundMilestone("APPROVED_AND_PAID"), false);
  assert.equal(canFundMilestone("DISPUTED"), false);
});

test("only submitted milestones can be released", () => {
  assert.equal(canReleaseMilestone("PENDING"), false);
  assert.equal(canReleaseMilestone("FUNDED_IN_ESCROW"), false);
  assert.equal(canReleaseMilestone("SUBMITTED_FOR_REVIEW"), true);
  assert.equal(canReleaseMilestone("APPROVED_AND_PAID"), false);
  assert.equal(canReleaseMilestone("DISPUTED"), false);
});

test("only disputed milestones can be refunded", () => {
  assert.equal(canRefundMilestone("PENDING"), false);
  assert.equal(canRefundMilestone("FUNDED_IN_ESCROW"), false);
  assert.equal(canRefundMilestone("SUBMITTED_FOR_REVIEW"), false);
  assert.equal(canRefundMilestone("APPROVED_AND_PAID"), false);
  assert.equal(canRefundMilestone("DISPUTED"), true);
});

test("only funded milestones can be submitted for review", () => {
  assert.equal(canSubmitMilestone("PENDING"), false);
  assert.equal(canSubmitMilestone("FUNDED_IN_ESCROW"), true);
  assert.equal(canSubmitMilestone("SUBMITTED_FOR_REVIEW"), false);
  assert.equal(canSubmitMilestone("APPROVED_AND_PAID"), false);
  assert.equal(canSubmitMilestone("DISPUTED"), false);
});

test("late funding webhooks cannot downgrade paid milestones", () => {
  assert.equal(
    shouldApplyFundingEvent({
      status: "APPROVED_AND_PAID",
      currentPaymentIntentId: "pi_original",
      incomingPaymentIntentId: "pi_late",
    }),
    false
  );
});

test("duplicate funding webhooks are idempotent", () => {
  assert.equal(
    shouldApplyFundingEvent({
      status: "FUNDED_IN_ESCROW",
      currentPaymentIntentId: "pi_123",
      incomingPaymentIntentId: "pi_123",
    }),
    false
  );
});

test("a fresh pending milestone accepts its first payment intent", () => {
  assert.equal(
    shouldApplyFundingEvent({
      status: "PENDING",
      currentPaymentIntentId: null,
      incomingPaymentIntentId: "pi_new",
    }),
    true
  );
});
