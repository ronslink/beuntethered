import assert from "node:assert/strict";
import test from "node:test";
import {
  createStripeClient,
  getAppBaseUrl,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isPaymentConfigurationError,
} from "../src/lib/stripe.ts";

test("requires a real Stripe secret key", () => {
  assert.throws(
    () => getStripeSecretKey({}),
    (error) => isPaymentConfigurationError(error)
  );

  assert.throws(
    () => getStripeSecretKey({ STRIPE_SECRET_KEY: "sk_test_123" }),
    /Replace the placeholder/
  );

  assert.throws(
    () => getStripeSecretKey({ STRIPE_SECRET_KEY: "not-a-secret" }),
    /must be a Stripe secret key/
  );

  assert.equal(
    getStripeSecretKey({ STRIPE_SECRET_KEY: "sk_test_enterprise_ready" }),
    "sk_test_enterprise_ready"
  );
});

test("requires a Stripe webhook signing secret", () => {
  assert.throws(
    () => getStripeWebhookSecret({ STRIPE_SECRET_KEY: "sk_test_enterprise_ready" }),
    /STRIPE_WEBHOOK_SECRET is required/
  );

  assert.throws(
    () => getStripeWebhookSecret({ STRIPE_WEBHOOK_SECRET: "secret" }),
    /must be a Stripe webhook signing secret/
  );

  assert.equal(
    getStripeWebhookSecret({ STRIPE_WEBHOOK_SECRET: "whsec_enterprise_ready" }),
    "whsec_enterprise_ready"
  );
});

test("resolves the application base URL for Stripe redirects", () => {
  assert.equal(getAppBaseUrl({ NEXTAUTH_URL: "https://app.example.com" }), "https://app.example.com");
  assert.equal(getAppBaseUrl({ NEXT_PUBLIC_APP_URL: "https://public.example.com" }), "https://public.example.com");
  assert.equal(getAppBaseUrl({ VERCEL_URL: "untether.vercel.app" }), "https://untether.vercel.app");
  assert.equal(getAppBaseUrl({}), "http://127.0.0.1:3200");
});

test("creates a Stripe client only when payment config is present", () => {
  assert.throws(
    () => createStripeClient({}),
    (error) => isPaymentConfigurationError(error)
  );

  assert.doesNotThrow(() => createStripeClient({ STRIPE_SECRET_KEY: "sk_test_enterprise_ready" }));
});
