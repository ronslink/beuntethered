import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature") as string;
    const payload = await req.text();

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook Signature Verification Failed: ${err.message}` }, { status: 400 });
    }

    // Sync database state from successful Stripe clearing process securely
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const milestoneId = paymentIntent.metadata.milestoneId;

      if (milestoneId) {
        await prisma.milestone.update({
          where: { id: milestoneId },
          data: { status: "FUNDED_IN_ESCROW", stripe_payment_intent_id: paymentIntent.id }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
