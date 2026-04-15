"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "missing-key");

// ─────────────────────────────────────────────
// FACILITATOR: Submit a new bid
// ─────────────────────────────────────────────
export async function submitBid({
  projectId,
  proposedAmount,
  estimatedDays,
  technicalApproach,
  proposedTechStack,
  techStackReason,
  proposedMilestones,
  requiredEscrowPct,
}: {
  projectId: string;
  proposedAmount: number;
  estimatedDays: number;
  technicalApproach: string;
  proposedTechStack?: string;
  techStackReason?: string;
  proposedMilestones?: { title: string; amount: number; days: number; description?: string }[];
  requiredEscrowPct?: number; // 10 | 25 | 50 | 75 | 100
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Only facilitators can submit bids.");

    // Block bids from facilitators who haven't completed onboarding
    const facilitatorProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboarding_complete: true },
    });
    if (!facilitatorProfile?.onboarding_complete) {
      throw new Error("Please complete your profile setup before submitting bids.");
    }

    const targetProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (!targetProject || targetProject.status !== "OPEN_BIDDING") {
      throw new Error("This project is no longer accepting bids.");
    }

    const existingBid = await prisma.bid.findFirst({
      where: { project_id: projectId, developer_id: user.id },
    });
    if (existingBid) {
      throw new Error("You already have a bid on this project.");
    }

    const bid = await prisma.bid.create({
      data: {
        project_id: projectId,
        developer_id: user.id,
        proposed_amount: proposedAmount,
        estimated_days: estimatedDays,
        technical_approach: technicalApproach,
        proposed_tech_stack: proposedTechStack || null,
        tech_stack_reason: techStackReason || null,
        proposed_milestones: proposedMilestones ? JSON.stringify(proposedMilestones) : undefined,
        ai_translation_summary: "Pending AI analysis...",
        required_escrow_pct: requiredEscrowPct ?? 100,
        status: "PENDING",
      },
    });

    // Kick off async AI scoring — fire and forget
    fetch(`${process.env.NEXTAUTH_URL}/api/ai/analyze-bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bidId: bid.id,
        projectId,
        proposedAmount,
        estimatedDays,
        technicalApproach,
        proposedTechStack,
        proposedMilestones,
      }),
    }).catch(() => {}); // non-blocking

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (project?.client?.email) {
      resend.emails.send({
        from: "Untether Marketplace <marketplace@untether.network>",
        to: project.client.email,
        subject: `New Bid on "${project.title}"`,
        html: `<p>A facilitator submitted a proposal. <a href="${process.env.NEXTAUTH_URL}/projects/${project.id}">Review it here →</a></p>`,
      }).catch(() => {});
    }

    revalidatePath("/marketplace");
    revalidatePath(`/projects/${projectId}`);
    return { success: true, bidId: bid.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CLIENT: Shortlist a bid
// ─────────────────────────────────────────────
export async function shortlistBid(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized.");

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true },
    });
    if (!bid || bid.project.client_id !== user.id) throw new Error("Not your project.");
    if (bid.status !== "PENDING") throw new Error("Only pending bids can be shortlisted.");

    await prisma.bid.update({
      where: { id: bidId },
      data: { status: "SHORTLISTED" },
    });

    revalidatePath(`/projects/${bid.project_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CLIENT: Enter negotiation (exclusive lock)
// ─────────────────────────────────────────────
export async function enterNegotiation(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized.");

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true },
    });
    if (!bid || bid.project.client_id !== user.id) throw new Error("Not your project.");

    // Check no other active negotiation on this project
    if (bid.project.active_bid_id && bid.project.active_bid_id !== bidId) {
      throw new Error("A negotiation is already in progress on this project. Close it first.");
    }

    await prisma.$transaction([
      prisma.bid.update({ where: { id: bidId }, data: { status: "UNDER_NEGOTIATION" } }),
      prisma.project.update({ where: { id: bid.project_id }, data: { active_bid_id: bidId } }),
    ]);

    revalidatePath(`/projects/${bid.project_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CLIENT: Counter a bid
// ─────────────────────────────────────────────
export async function counterBid({
  bidId,
  counterAmount,
  counterReason,
  counterMilestones,
  counterEscrowPct,
}: {
  bidId: string;
  counterAmount: number;
  counterReason: string;
  counterMilestones?: { title: string; amount: number; days: number; description?: string }[];
  counterEscrowPct?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized.");

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true, developer: true },
    });
    if (!bid || bid.project.client_id !== user.id) throw new Error("Not your project.");
    if (bid.status !== "UNDER_NEGOTIATION") throw new Error("This bid is not in active negotiation.");
    if (bid.negotiation_rounds >= 3) throw new Error("Maximum negotiation rounds (3) reached.");

    await prisma.bid.update({
      where: { id: bidId },
      data: {
        counter_amount: counterAmount,
        counter_reason: counterReason,
        counter_milestones: counterMilestones ? JSON.stringify(counterMilestones) : undefined,
        last_action_by: "CLIENT",
        negotiation_rounds: { increment: 1 },
        ...(counterEscrowPct != null ? { counter_escrow_pct: counterEscrowPct } : {}),
      },
    });

    // Notify facilitator
    if (bid.developer?.email) {
      resend.emails.send({
        from: "Untether Marketplace <marketplace@untether.network>",
        to: bid.developer.email,
        subject: `Counter Offer on "${bid.project.title}"`,
        html: `<p>The client has countered your proposal at $${counterAmount}. <a href="${process.env.NEXTAUTH_URL}/marketplace">View it →</a></p>`,
      }).catch(() => {});
    }

    revalidatePath(`/projects/${bid.project_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// FACILITATOR: Accept client's counter
// ─────────────────────────────────────────────
export async function acceptCounter(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized.");

    let projectId!: string;

    await prisma.$transaction(async (tx) => {
      // ── Re-read inside the transaction to close the TOCTOU window ──────────
      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        include: { project: { include: { milestones: true } } },
      });
      if (!bid || bid.developer_id !== user.id) throw new Error("Not your bid.");
      if (bid.status !== "UNDER_NEGOTIATION") throw new Error("Bid is no longer in negotiation.");

      const finalAmount = bid.counter_amount ? Number(bid.counter_amount) : Number(bid.proposed_amount);
      projectId = bid.project_id;

      // Accept this bid
      await tx.bid.update({ where: { id: bidId }, data: { status: "ACCEPTED", proposed_amount: finalAmount } });

      // Reject all other bids
      await tx.bid.updateMany({
        where: { project_id: projectId, id: { not: bidId } },
        data: { status: "REJECTED" },
      });

      // Rescale milestones to counter amount if custom milestones provided
      const milestonesToUse = bid.counter_milestones
        ? (JSON.parse(bid.counter_milestones as string) as any[])
        : null;

      if (milestonesToUse && milestonesToUse.length > 0) {
        // Delete existing milestones and create proposed ones
        await tx.milestone.deleteMany({ where: { project_id: projectId } });
        for (const m of milestonesToUse) {
          await tx.milestone.create({
            data: {
              project_id: projectId,
              facilitator_id: user.id,
              title: m.title,
              amount: m.amount,
              estimated_duration_days: m.days,
              description: m.description || null,
              status: "PENDING",
              acceptance_criteria: [],
              deliverables: [],
            },
          });
        }
      } else {
        // Rescale existing milestones proportionally
        const originalTotal = bid.project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
        if (originalTotal > 0 && originalTotal !== finalAmount) {
          const ratio = finalAmount / originalTotal;
          for (const m of bid.project.milestones) {
            await tx.milestone.update({
              where: { id: m.id },
              data: { amount: Math.round(Number(m.amount) * ratio * 100) / 100, facilitator_id: user.id },
            });
          }
        } else {
          await tx.milestone.updateMany({
            where: { project_id: projectId },
            data: { facilitator_id: user.id },
          });
        }
      }

      // Activate project + clear negotiation lock
      await tx.project.update({
        where: { id: projectId },
        data: { status: "ACTIVE", active_bid_id: null },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/marketplace");
    return { success: true, projectId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CLIENT: Accept a bid directly (no negotiation)
// ─────────────────────────────────────────────
export async function acceptBid(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized.");

    // Pre-fetch developer for email notification (outside tx, read-only)
    const bidForEmail = await prisma.bid.findUnique({
      where: { id: bidId },
      select: { developer: { select: { email: true } }, project: { select: { title: true } } },
    });

    let projectId!: string;
    let developerEmail: string | null | undefined;
    let projectTitle: string = "";

    await prisma.$transaction(async (tx) => {
      // ── Re-read inside the transaction to close the TOCTOU window ──────────
      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        include: { project: { include: { milestones: true } } },
      });
      if (!bid || bid.project.client_id !== user.id || bid.project.status !== "OPEN_BIDDING") {
        throw new Error("Cannot accept this bid.");
      }

      projectId = bid.project_id;
      developerEmail = bidForEmail?.developer?.email;
      projectTitle = bidForEmail?.project?.title ?? "";
      const proposedAmount = Number(bid.proposed_amount);
      const proposedMilestones = bid.proposed_milestones
        ? (JSON.parse(bid.proposed_milestones as string) as any[])
        : null;

      await tx.bid.update({ where: { id: bidId }, data: { status: "ACCEPTED" } });
      await tx.bid.updateMany({
        where: { project_id: projectId, id: { not: bidId } },
        data: { status: "REJECTED" },
      });

      if (proposedMilestones && proposedMilestones.length > 0) {
        await tx.milestone.deleteMany({ where: { project_id: projectId } });
        for (const m of proposedMilestones) {
          await tx.milestone.create({
            data: {
              project_id: projectId,
              facilitator_id: bid.developer_id,
              title: m.title,
              amount: m.amount,
              estimated_duration_days: m.days,
              description: m.description || null,
              status: "PENDING",
              acceptance_criteria: [],
              deliverables: [],
            },
          });
        }
      } else {
        const originalTotal = bid.project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
        if (originalTotal > 0 && originalTotal !== proposedAmount) {
          const ratio = proposedAmount / originalTotal;
          for (const m of bid.project.milestones) {
            await tx.milestone.update({
              where: { id: m.id },
              data: { amount: Math.round(Number(m.amount) * ratio * 100) / 100, facilitator_id: bid.developer_id },
            });
          }
        } else {
          await tx.milestone.updateMany({
            where: { project_id: projectId },
            data: { facilitator_id: bid.developer_id },
          });
        }
      }

      await tx.project.update({ where: { id: projectId }, data: { status: "ACTIVE", active_bid_id: null } });
    });

    if (developerEmail) {
      resend.emails.send({
        from: "Untether Marketplace <marketplace@untether.network>",
        to: developerEmail,
        subject: `Your bid was accepted — "${projectTitle}"`,
        html: `<p>Congratulations! Your proposal has been accepted. The client is now funding the Escrow. <a href="${process.env.NEXTAUTH_URL}/command-center">View your active work →</a></p>`,
      }).catch(() => {});
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/marketplace");
    return { success: true, projectId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// EITHER PARTY: Reject a bid / end negotiation
// ─────────────────────────────────────────────
export async function rejectBid(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized.");

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: true },
    });
    if (!bid) throw new Error("Bid not found.");

    const isClient = user.role === "CLIENT" && bid.project.client_id === user.id;
    const isFacilitator = user.role === "FACILITATOR" && bid.developer_id === user.id;
    if (!isClient && !isFacilitator) throw new Error("Unauthorized.");

    await prisma.$transaction([
      prisma.bid.update({ where: { id: bidId }, data: { status: "REJECTED" } }),
      prisma.project.update({ where: { id: bid.project_id }, data: { active_bid_id: null } }),
    ]);

    revalidatePath(`/projects/${bid.project_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// CLIENT: Re-open bidding on a failed deal
// ─────────────────────────────────────────────
export async function reopenBidding(projectId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized.");

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.client_id !== user.id) throw new Error("Not your project.");

    await prisma.$transaction([
      // Reset project
      prisma.project.update({
        where: { id: projectId },
        data: { status: "OPEN_BIDDING", active_bid_id: null },
      }),
      // Reject all existing bids so fresh slate
      prisma.bid.updateMany({
        where: { project_id: projectId, status: { in: ["PENDING", "SHORTLISTED", "UNDER_NEGOTIATION", "REJECTED"] } },
        data: { status: "REJECTED" },
      }),
    ]);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/marketplace");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
