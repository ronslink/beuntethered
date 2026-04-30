import assert from "node:assert/strict";
import test from "node:test";
import { shouldSendEmailForPreference } from "../src/lib/email-preferences.ts";

test("essential workflow emails are always eligible", () => {
  assert.equal(
    shouldSendEmailForPreference("ESSENTIAL_WORKFLOW", {
      notify_payment_updates: false,
      notify_new_proposals: false,
      notify_milestone_reviews: false,
    }),
    true
  );
});

test("payment and milestone emails default to enabled unless explicitly disabled", () => {
  assert.equal(shouldSendEmailForPreference("PAYMENT_UPDATE", null), true);
  assert.equal(shouldSendEmailForPreference("MILESTONE_REVIEW", undefined), true);
  assert.equal(shouldSendEmailForPreference("PAYMENT_UPDATE", { notify_payment_updates: false }), false);
  assert.equal(shouldSendEmailForPreference("MILESTONE_REVIEW", { notify_milestone_reviews: false }), false);
});

test("proposal emails require explicit opt-in", () => {
  assert.equal(shouldSendEmailForPreference("NEW_PROPOSAL", null), false);
  assert.equal(shouldSendEmailForPreference("NEW_PROPOSAL", { notify_new_proposals: false }), false);
  assert.equal(shouldSendEmailForPreference("NEW_PROPOSAL", { notify_new_proposals: true }), true);
});

test("saved search alert emails are controlled by saved search cadence", () => {
  assert.equal(shouldSendEmailForPreference("SAVED_SEARCH_ALERT", null), true);
  assert.equal(shouldSendEmailForPreference("SAVED_SEARCH_ALERT", { notify_new_proposals: false }), true);
});
