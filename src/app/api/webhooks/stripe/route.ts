import { NextResponse } from "next/server";
import { sendEscrowFundedAlert } from "@/lib/resend";
import { shouldSendEmailForPreference } from "@/lib/email-preferences";
import Stripe from "stripe";
import { createStripeClient, getStripeWebhookSecret, isPaymentConfigurationError } from "@/lib/stripe";
import {
  markMilestoneFundingFailed,
  reconcileChangeOrderFunding,
  reconcileEscrowTransfer,
  reconcileMilestoneFunding,
} from "@/lib/payment-reconciliation";
import {
  getCheckoutPaymentIntentId,
  getMilestoneIdFromPaymentIntent,
  getMilestoneIdFromTransfer,
} from "@/lib/stripe-webhook";
import {
  syncStripeConnectVerification,
  syncStripeIdentityVerificationSession,
} from "@/lib/facilitator-verification";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature") as string;
    const payload = await req.text();

    let event: Stripe.Event;
    const stripe = createStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook Signature Verification Failed: ${err.message}` },
        { status: 400 }
      );
    }

    // ─── PRIMARY: Checkout Session completed ─────────────────────────────────
    // Metadata lives on the session object, not the PaymentIntent.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentIntentId = getCheckoutPaymentIntentId(session);
      const milestoneId = session.metadata?.milestone_id;
      const changeOrderId = session.metadata?.change_order_id;

      // ── Milestone Escrow Funding ──────────────────────────────────────────
      if (milestoneId) {
        const result = await reconcileMilestoneFunding({
          milestoneId,
          paymentIntentId,
          checkoutSessionId: session.id,
          source: "webhook_checkout",
        });

        if (
          result.applied &&
          result.milestone.facilitator?.email &&
          shouldSendEmailForPreference("PAYMENT_UPDATE", result.milestone.facilitator)
        ) {
          void sendEscrowFundedAlert(
            result.milestone.facilitator.email,
            result.milestone.project.title,
            Number(result.milestone.amount)
          ).catch((err) =>
            console.error("[webhook] sendEscrowFundedAlert failed:", err)
          );
        }
      }

      // ── Change Order Top-Up ───────────────────────────────────────────────
      if (changeOrderId) {
        await reconcileChangeOrderFunding({
          changeOrderId,
          paymentIntentId,
          checkoutSessionId: session.id,
          source: "webhook_checkout",
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const milestoneId = session.metadata?.milestone_id;
      if (milestoneId) {
        await markMilestoneFundingFailed({
          milestoneId,
          paymentIntentId: getCheckoutPaymentIntentId(session),
          checkoutSessionId: session.id,
          status: "CANCELLED",
          source: "webhook_checkout_expired",
        });
      }
    }

    // ─── transfer.created — payout confirmation safety net ───────────────────
    // Fires when stripe.transfers.create completes. Marks APPROVED_AND_PAID
    // only if the release-escrow endpoint hasn't already done so.
    if (event.type === "transfer.created") {
      const transfer = event.data.object as Stripe.Transfer;
      const milestoneId = getMilestoneIdFromTransfer(transfer);
      if (milestoneId) {
        await reconcileEscrowTransfer({
          milestoneId,
          transferId: transfer.id,
          source: "webhook_transfer",
        });
      }
    }

    // ─── SAFETY NET: payment_intent.succeeded ────────────────────────────────
    // Handles direct PaymentIntents (non-Checkout) — milestone_id lives on PI metadata.
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const milestoneId = getMilestoneIdFromPaymentIntent(paymentIntent);

      if (milestoneId) {
        await reconcileMilestoneFunding({
          milestoneId,
          paymentIntentId: paymentIntent.id,
          source: "webhook_payment_intent",
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const milestoneId = getMilestoneIdFromPaymentIntent(paymentIntent);

      if (milestoneId) {
        await markMilestoneFundingFailed({
          milestoneId,
          paymentIntentId: paymentIntent.id,
          status: "FAILED",
          source: "webhook_payment_failed",
        });
      }
    }

    if (event.type === "account.updated") {
      await syncStripeConnectVerification(event.data.object as Stripe.Account);
    }

    if (event.type.startsWith("identity.verification_session.")) {
      await syncStripeIdentityVerificationSession(event.data.object as Stripe.Identity.VerificationSession);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    if (isPaymentConfigurationError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    console.error("[Stripe Webhook] Fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
