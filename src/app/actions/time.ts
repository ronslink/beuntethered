"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function logTimeEntry(data: { milestoneId: string, hours: number, proofUrl?: string, proofDescription?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized Network Access");

    const milestone = await prisma.milestone.findUnique({
      where: { id: data.milestoneId },
      include: { project: true }
    });

    if (!milestone || milestone.facilitator_id !== user.id) throw new Error("Invalid Escrow Phase match.");

    // Verify Sprint Gate Limit natively querying across all phase milestones
    const allProjectMilestones = await prisma.milestone.findMany({ where: { project_id: milestone.project_id }});
    const milestoneIds = allProjectMilestones.map(m => m.id);

    const pendingSum = await prisma.timeEntry.aggregate({
       where: { facilitator_id: user.id, milestone_id: { in: milestoneIds }, status: "PENDING" },
       _sum: { hours: true }
    });

    const currentPending = Number(pendingSum._sum.hours || 0);

    if (currentPending + data.hours > milestone.project.unreviewed_hours_limit) {
       throw new Error(`Sprint Gate Block: You cannot exceed ${milestone.project.unreviewed_hours_limit} unreviewed pending hours. You currently have ${currentPending} pending.`);
    }

    if (data.hours > 0 && !data.proofDescription) {
       throw new Error("Proof of Work description is mathematically required to log billable execution ranges.");
    }

    await prisma.timeEntry.create({
      data: {
        milestone_id: milestone.id,
        facilitator_id: user.id,
        hours: data.hours,
        proof_url: data.proofUrl || null,
        proof_description: data.proofDescription || null,
        status: "PENDING"
      }
    });

    revalidatePath("/command-center");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveTimesheet(timeEntryIds: string[]) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized Escrow Release.");

    const entries = await prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, status: "PENDING" },
      include: { milestone: { include: { project: true } }, facilitator: true }
    });

    if (!entries.length) return { success: false, error: "No pending entries located." };

    const firstEntry = entries[0];
    if (firstEntry.milestone.project.client_id !== user.id) throw new Error("Unauthorized Client Map");

    const facilitatorStripeId = firstEntry.facilitator.stripe_account_id;
    if (!facilitatorStripeId) throw new Error("Facilitator lacks active Escrow payout target.");

    const hourlyRate = Number(firstEntry.facilitator.hourly_rate || 0);
    if (hourlyRate <= 0) throw new Error("Facilitator does not have a mathematically valid hourly rate configured.");

    const totalHours = entries.reduce((acc, e) => acc + Number(e.hours), 0);
    const grossPayoutInCents = Math.round(totalHours * hourlyRate * 100);

    // Platform logic 5% vs 0% BYOC bypass
    const isByoc = firstEntry.milestone.project.is_byoc;
    const platformFee = isByoc ? 0 : Math.round(grossPayoutInCents * 0.05);
    const finalPayout = grossPayoutInCents - platformFee;

    if (finalPayout > 0) {
       await stripe.transfers.create({
         amount: finalPayout,
         currency: "usd",
         destination: facilitatorStripeId,
         transfer_group: `milestone_${firstEntry.milestone_id}`,
       });
    }

    await prisma.timeEntry.updateMany({
       where: { id: { in: timeEntryIds } },
       data: { status: "APPROVED" }
    });

    revalidatePath("/command-center");
    return { success: true, payoutCents: finalPayout };
  } catch (error: any) {
    console.error("Timesheet Approval Error", error);
    return { success: false, error: error.message };
  }
}

export async function disputeTimeEntry(timeEntryId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized");

    const entry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: { milestone: { include: { project: true } } }
    });

    if (!entry || entry.milestone.project.client_id !== user.id) throw new Error("Validation mismatch.");

    await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: { status: "DISPUTED" }
    });

    await prisma.project.update({
      where: { id: entry.milestone.project_id },
      data: { status: "DISPUTED" }
    });

    revalidatePath("/command-center");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
