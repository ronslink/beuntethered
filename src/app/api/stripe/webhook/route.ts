import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/auth";
import { sendEscrowFundedAlert } from "@/lib/resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("Webhook Signature Verification Failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        if (!metadata || !metadata.milestone_id) {
           console.log("No milestone_id found in payment intent metadata. Skipping custom logic.");
           break;
        }

        const milestone = await prisma.milestone.findUnique({
           where: { id: metadata.milestone_id },
           include: { project: true, facilitator: true }
        });

        if (!milestone) break;

        // 1. Update Database Status safely avoiding async collisions natively 
        await prisma.milestone.update({
           where: { id: milestone.id },
           data: { 
              status: "FUNDED_IN_ESCROW",
              stripe_payment_intent_id: paymentIntent.id 
           }
        });

        if (milestone.project.status === "OPEN_BIDDING" || milestone.project.status === "DRAFT") {
           await prisma.project.update({
              where: { id: milestone.project.id },
              data: { status: "ACTIVE" }
           });
        }

        // 2. Automated Resend Notification Hook explicitly triggering when Stripe succeeds
        if (milestone.facilitator && milestone.facilitator.email) {
           await sendEscrowFundedAlert(
              milestone.facilitator.email, 
              milestone.project.title, 
              Number(milestone.amount)
           );
        }

        console.log(`[Webhook: Escrow Funded] Milestone ${milestone.id} secured internally.`);
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        const metadata = transfer.metadata;
        
        if (!metadata || !metadata.milestone_id) break;

        const milestone = await prisma.milestone.findUnique({
           where: { id: metadata.milestone_id }
        });

        if (milestone && milestone.status === "APPROVED_AND_PAID") {
           // Already resolved internally. Skip duplicate.
           break;
        }

        // Lock Milestone to internal constraints natively tracking exact payload
        await prisma.milestone.update({
           where: { id: metadata.milestone_id },
           data: { status: "APPROVED_AND_PAID" }
        });

        console.log(`[Webhook: Payout Complete] Escrow distributed automatically via Stripe Connect limitations.`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("Critical Webhook Pipeline Fault:", error);
    return new NextResponse(`Server Error: ${error.message}`, { status: 500 });
  }
}
