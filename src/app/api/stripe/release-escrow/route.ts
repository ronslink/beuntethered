import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // Escrow releases strictly originate from client approval operations
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await req.json();

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId, status: "FUNDED_IN_ESCROW" },
      include: { 
        project: true,
        facilitator: true 
      }
    });

    if (!milestone || milestone.project.client_id !== user.id) {
      return NextResponse.json({ error: "Invalid state. Milestone not funded in Escrow or client mismatch." }, { status: 400 });
    }

    const developerId = milestone.facilitator?.stripe_account_id;
    if (!developerId) {
      return NextResponse.json({ error: "Expert Connect onboarding incomplete. Escrow constrained." }, { status: 400 });
    }

    // ----- CRITICAL PLATFORM RULE OVERRIDE -----
    // Platform automatically parses BYOC constraint flags. 5% standard execution fee defaults against 0% BYOC bypass
    const isByoc = milestone.project.is_byoc;
    const totalAmount = Number(milestone.amount) * 100;
    const platformFee = isByoc ? 0 : Math.round(totalAmount * 0.05);
    const payoutAmount = totalAmount - platformFee;

    // Trigger 'Separate Transfer' safely routing Escrow payload to Expert
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: "usd",
      destination: developerId,
      transfer_group: `milestone_${milestone.id}`,
    });

    // Resolve milestone to completed standard locally
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { status: "APPROVED_AND_PAID" }
    });

    return NextResponse.json({ success: true, transfer: transfer.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
