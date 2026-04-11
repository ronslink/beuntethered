import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized. Escrow funding isolated to Clients." }, { status: 401 });
    }

    const { milestoneId } = await req.json();

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone || milestone.project.client_id !== user.id) {
      return NextResponse.json({ error: "Context not found or authorization forbidden" }, { status: 404 });
    }

    // Create PaymentIntent holding funds explicitly on the platform side of the ledger
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(milestone.amount) * 100),
      currency: "usd",
      payment_method_types: ["card", "us_bank_account"],
      transfer_group: `milestone_${milestone.id}`,
      metadata: {
        milestoneId: milestone.id,
        projectId: milestone.project.id
      }
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
