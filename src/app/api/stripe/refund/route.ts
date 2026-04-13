import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123");

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // We only allow platform administrators to drive raw refunds
    if (!user || user.email !== (process.env.ADMIN_EMAIL || "admin@untether.network")) {
      return NextResponse.json({ error: "Platform Arbiter permissions required." }, { status: 401 });
    }

    const { milestoneId } = await req.json();

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId }
    });

    if (!milestone || !milestone.stripe_payment_intent_id) {
      return NextResponse.json({ error: "Invalid state. Milestone unfunded or un-located." }, { status: 400 });
    }

    if (milestone.status !== "DISPUTED") {
       return NextResponse.json({ error: "Refunds can only be executed on DISPUTED bounds." }, { status: 400 });
    }

    // Trigger explicit mathematical reversal natively
    const refund = await stripe.refunds.create({
      payment_intent: milestone.stripe_payment_intent_id,
      metadata: { milestone_id: milestone.id }
    });

    // Unbind and destroy Escrow record locally 
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { 
          status: "PENDING", 
          stripe_payment_intent_id: null 
      }
    });

    return NextResponse.json({ success: true, refund_id: refund.id });
  } catch (error: any) {
    console.error("Escrow Refund Failure Matrix:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
