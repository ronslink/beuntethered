import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { sendEscrowFundedAlert } from "@/lib/resend";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature") as string;
    const payload = await req.text();

    let event: Stripe.Event;

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

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

      const milestoneId = session.metadata?.milestone_id;
      const changeOrderId = session.metadata?.change_order_id;

      // ── Milestone Escrow Funding ──────────────────────────────────────────
      if (milestoneId) {
        const milestone = await prisma.milestone.findUnique({
          where: { id: milestoneId },
          include: { project: true, facilitator: true },
        });

        if (milestone) {
          await prisma.milestone.update({
            where: { id: milestoneId },
            data: {
              status: "FUNDED_IN_ESCROW",
              stripe_payment_intent_id: paymentIntentId,
            },
          });

          // Notify the facilitator their escrow is now live
          if (milestone.facilitator?.email) {
            await sendEscrowFundedAlert(
              milestone.facilitator.email,
              milestone.project.title,
              Number(milestone.amount)
            ).catch((err) =>
              console.error("[webhook] sendEscrowFundedAlert failed:", err)
            );
          }
        }
      }

      // ── Change Order Top-Up ───────────────────────────────────────────────
      if (changeOrderId) {
        await prisma.changeOrder.update({
          where: { id: changeOrderId },
          data: { status: "ACCEPTED_AND_FUNDED" },
        });
      }
    }

    // ─── transfer.created — payout confirmation safety net ───────────────────
    // Fires when stripe.transfers.create completes. Marks APPROVED_AND_PAID
    // only if the release-escrow endpoint hasn't already done so.
    if (event.type === "transfer.created") {
      const transfer = event.data.object as Stripe.Transfer;
      const milestoneId = transfer.metadata?.milestone_id;
      if (milestoneId) {
        await prisma.milestone.updateMany({
          where: { id: milestoneId, status: { not: "APPROVED_AND_PAID" } },
          data: { status: "APPROVED_AND_PAID" },
        });
      }
    }

    // ─── SAFETY NET: payment_intent.succeeded ────────────────────────────────
    // Handles direct PaymentIntents (non-Checkout) — milestone_id lives on PI metadata.
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const milestoneId = paymentIntent.metadata?.milestone_id;

      if (milestoneId) {
        await prisma.milestone.update({
          where: { id: milestoneId },
          data: {
            status: "FUNDED_IN_ESCROW",
            stripe_payment_intent_id: paymentIntent.id,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
