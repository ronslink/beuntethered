import type Stripe from "stripe";

export function getCheckoutPaymentIntentId(
  session: Pick<Stripe.Checkout.Session, "payment_intent">
) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
}

export function getMilestoneIdFromPaymentIntent(
  paymentIntent: Pick<Stripe.PaymentIntent, "metadata">
) {
  return paymentIntent.metadata?.milestone_id ?? null;
}

export function getMilestoneIdFromTransfer(transfer: Pick<Stripe.Transfer, "metadata">) {
  return transfer.metadata?.milestone_id ?? null;
}
