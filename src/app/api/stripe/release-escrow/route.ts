import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { generateSignedDownloadUrl } from "@/lib/storage";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123");

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // Escrow releases strictly originate from client approval operations
    if (!user || user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await req.json();

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { 
        project: true,
        facilitator: true 
      }
    });

    if (!milestone || milestone.project.client_id !== user.id) {
      return NextResponse.json({ error: "Invalid state. Client mismatch or milestone not found." }, { status: 400 });
    }

    const developerId = milestone.facilitator?.stripe_account_id;
    if (!developerId) {
      return NextResponse.json({ error: "Expert Connect onboarding incomplete. Escrow constrained." }, { status: 400 });
    }

    // ── Atomic Check-and-Set ────────────────────────────────────────────────
    // Use updateMany with a status precondition. If another concurrent request
    // already claimed this milestone, count === 0 and we abort before Stripe.
    const claimed = await prisma.milestone.updateMany({
      where: {
        id: milestoneId,
        status: { in: ["FUNDED_IN_ESCROW", "SUBMITTED_FOR_REVIEW"] },
        project: { client_id: user.id },
      },
      data: { status: "APPROVED_AND_PAID", paid_at: new Date() },
    });

    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "Milestone is not in a payable state or has already been processed." },
        { status: 409 }
      );
    }

    // ── Stripe Payout ───────────────────────────────────────────────────────
    // Idempotency key ensures Stripe deduplicates if this endpoint is hit twice
    // (e.g. network retry or double-click) — no second transfer will be issued.
    const isByoc = milestone.project.is_byoc;
    const totalAmount = Number(milestone.amount) * 100;
    // Fee tiers: 8% marketplace, 5% BYOC (facilitator brought the client)
    const feeRate = isByoc ? 0.05 : 0.08;
    const platformFee = Math.round(totalAmount * feeRate);
    const payoutAmount = totalAmount - platformFee;

    let transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: payoutAmount,
          currency: "usd",
          destination: developerId,
          transfer_group: `milestone_${milestone.id}`,
          metadata: { milestone_id: milestone.id },
        },
        { idempotencyKey: `release_escrow_${milestone.id}` }
      );
    } catch (stripeErr: any) {
      // Roll back the DB status update if Stripe fails
      await prisma.milestone.updateMany({
        where: { id: milestoneId, status: "APPROVED_AND_PAID" },
        data: { status: "SUBMITTED_FOR_REVIEW" },
      });
      throw stripeErr;
    }

    // Synchronously iterate explicit Trust Metrics bumping their tier algorithm logic inherently
    if (milestone.facilitator_id) {
       await prisma.user.update({
          where: { id: milestone.facilitator_id },
          data: {
             total_sprints_completed: { increment: 1 }
          }
       });
    }

    let downloadUrl = null;
    if (milestone.payload_storage_path) {
      downloadUrl = await generateSignedDownloadUrl(milestone.payload_storage_path);
    }

    return NextResponse.json({ success: true, transfer: transfer.id, downloadUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
