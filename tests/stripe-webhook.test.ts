import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  getCheckoutPaymentIntentId,
  getMilestoneIdFromPaymentIntent,
  getMilestoneIdFromTransfer,
} from "../src/lib/stripe-webhook.ts";

test("reads checkout payment intent ids from Stripe session shapes", () => {
  assert.equal(getCheckoutPaymentIntentId({ payment_intent: "pi_string" }), "pi_string");
  assert.equal(
    getCheckoutPaymentIntentId({ payment_intent: { id: "pi_object" } as Stripe.PaymentIntent }),
    "pi_object"
  );
  assert.equal(getCheckoutPaymentIntentId({ payment_intent: null }), null);
});

test("reads milestone ids from payment intent metadata", () => {
  assert.equal(
    getMilestoneIdFromPaymentIntent({ metadata: { milestone_id: "milestone_1" } }),
    "milestone_1"
  );
  assert.equal(getMilestoneIdFromPaymentIntent({ metadata: {} }), null);
});

test("reads milestone ids from transfer metadata", () => {
  assert.equal(
    getMilestoneIdFromTransfer({ metadata: { milestone_id: "milestone_2" } }),
    "milestone_2"
  );
  assert.equal(getMilestoneIdFromTransfer({ metadata: {} }), null);
});
