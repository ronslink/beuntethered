import Stripe from "stripe";
import { getAppBaseUrl as resolveAppBaseUrl } from "./app-url.ts";

export const STRIPE_API_VERSION = "2026-03-25.dahlia";
export const PAYMENT_CONFIGURATION_ERROR_CODE = "PAYMENT_CONFIGURATION_MISSING";

type StripeEnv = Partial<
  Record<"NEXTAUTH_URL" | "NEXT_PUBLIC_APP_URL" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "VERCEL_URL", string>
>;

export class PaymentConfigurationError extends Error {
  code = PAYMENT_CONFIGURATION_ERROR_CODE;

  constructor(message = "Payments are not configured. Set STRIPE_SECRET_KEY before using payment workflows.") {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

function readRequiredEnv(env: StripeEnv, key: keyof StripeEnv) {
  const value = env[key]?.trim();
  if (!value) {
    throw new PaymentConfigurationError(`${key} is required for payment workflows.`);
  }
  return value;
}

export function getStripeSecretKey(env: StripeEnv = process.env) {
  const secretKey = readRequiredEnv(env, "STRIPE_SECRET_KEY");
  if (secretKey === "sk_test_123") {
    throw new PaymentConfigurationError("Replace the placeholder STRIPE_SECRET_KEY before using payment workflows.");
  }
  if (!secretKey.startsWith("sk_")) {
    throw new PaymentConfigurationError("STRIPE_SECRET_KEY must be a Stripe secret key.");
  }
  return secretKey;
}

export function getStripeWebhookSecret(env: StripeEnv = process.env) {
  const webhookSecret = readRequiredEnv(env, "STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret.startsWith("whsec_")) {
    throw new PaymentConfigurationError("STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret.");
  }
  return webhookSecret;
}

export function getAppBaseUrl(env: StripeEnv = process.env) {
  return resolveAppBaseUrl(env);
}

export function createStripeClient(env: StripeEnv = process.env) {
  return new Stripe(getStripeSecretKey(env), {
    apiVersion: STRIPE_API_VERSION,
  });
}

export function isPaymentConfigurationError(error: unknown): error is PaymentConfigurationError {
  return error instanceof PaymentConfigurationError;
}
