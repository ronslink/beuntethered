"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123");

/**
 * Validates physical Arbiter bounds
 */
async function enforceArbiterPermissions() {
  const user = await getCurrentUser();
  if (!user || user.email !== (process.env.ADMIN_EMAIL || "admin@untether.network")) {
    throw new Error("UNAUTHORIZED_ARBITER_FAULT: You exceed bounds.");
  }
  return user;
}

export async function resolveDisputeForClient(disputeId: string) {
  try {
    const arbiter = await enforceArbiterPermissions();

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { milestone: true, project: true }
    });

    if (!dispute || dispute.status !== "OPEN") throw new Error("Dispute is structurally inactive.");

    // ── Trigger Stripe Refund ───────────────────────────────────────────
    // Refund the escrowed funds back to the client via Stripe
    if (dispute.milestone.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: dispute.milestone.stripe_payment_intent_id,
      });
    }

    
    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: "RESOLVED_CLIENT" }
      }),
      // Reset milestone so the client can re-fund after the Stripe refund clears
      prisma.milestone.update({
        where: { id: dispute.milestone_id },
        data: { status: "PENDING", stripe_payment_intent_id: null },
      }),
      prisma.project.update({
        where: { id: dispute.project_id },
        data: { status: "ACTIVE" } // Unfreeze the project
      }),
      prisma.timelineEvent.create({
        data: {
          project_id: dispute.project_id,
          milestone_id: dispute.milestone_id,
          type: "DISPUTE",
          status: "FAILED", // Milestone failed
          description: `Arbitration resolved in favor of Client. Escrow refunded. Milestone reset to PENDING. Arbiter: ${arbiter.name || 'System'}`,
          author: "Admin Authority"
        }
      })
    ]);

    revalidatePath("/admin/disputes");
    revalidatePath(`/command-center/${dispute.project_id}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resolveDisputeForFacilitator(disputeId: string) {
  try {
    const arbiter = await enforceArbiterPermissions();

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { milestone: true, project: true }
    });

    if (!dispute || dispute.status !== "OPEN") throw new Error("Dispute is structurally inactive.");

    // Physically bypass the client's hold and force the milestone to APPROVED
    await prisma.$transaction([
        prisma.dispute.update({
            where: { id: dispute.id },
            data: { status: "RESOLVED_FACILITATOR" }
        }),
        prisma.milestone.update({
            where: { id: dispute.milestone_id },
            data: { status: "APPROVED_AND_PAID" }
        }),
        prisma.project.update({
            where: { id: dispute.project_id },
            data: { status: "ACTIVE" }
        }),
        prisma.timelineEvent.create({
            data: {
              project_id: dispute.project_id,
              milestone_id: dispute.milestone_id,
              type: "DISPUTE",
              status: "SUCCESS",
              description: `Arbitration resolved in favor of Facilitator. AI Fact Finding supported expert execution. Payout overridden physically by Arbiter: ${arbiter.name || 'System'}`,
              author: "Admin Authority"
            }
        })
    ]);

    revalidatePath("/admin/disputes");
    revalidatePath(`/command-center/${dispute.project_id}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
