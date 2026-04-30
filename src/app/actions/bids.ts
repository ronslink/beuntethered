"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { recordActivity } from "@/lib/activity";
import { bidInputSchema } from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import {
  assertProjectBuyerManager,
  getProjectBuyerActivityMetadata,
  userCanManageBuyerProject,
} from "@/lib/project-access";
import { buildBidScoreCard, summarizeBidScoreCard } from "@/lib/bid-analysis";
import { sendBidAcceptedAlert, sendBidCounterAlert, sendNewBidAlert } from "@/lib/resend";
import { getFacilitatorAwardReadiness } from "@/lib/bid-award-rules";
import { shouldSendEmailForPreference } from "@/lib/email-preferences";
import {
  assessBidSelfDealingRisk,
  requestRiskFingerprintFromHeaders,
} from "@/lib/account-risk";
import { recordAccountRiskSignal } from "@/lib/account-risk-db";

function getBidValidationMessage(fieldErrors: Record<string, string[] | undefined>) {
  if (fieldErrors.technicalApproach?.[0]) return fieldErrors.technicalApproach[0];
  if (fieldErrors.proposedAmount?.[0]) return fieldErrors.proposedAmount[0];
  if (fieldErrors.estimatedDays?.[0]) return fieldErrors.estimatedDays[0];
  if (fieldErrors.proposedMilestones?.[0]) return "Review each milestone title, amount, and timeline before submitting.";
  if (fieldErrors.requiredEscrowPct?.[0]) return "Choose a valid escrow funding requirement.";
  return "Please complete the proposal details before submitting.";
}

type ProposedMilestone = {
  title?: string;
  amount?: number;
  days?: number;
  description?: string | null;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
};

function parseStoredMilestones(value: unknown): ProposedMilestone[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as ProposedMilestone[];
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 10);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|;|(?<=\.)\s+/g)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
}

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
  proposedMilestones?: {
    title: string;
    amount: number;
    days: number;
    description?: string;
    deliverables?: string[];
    acceptance_criteria?: string[];
  }[];
  requiredEscrowPct?: number; // 10 | 25 | 50 | 75 | 100
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Only facilitators can submit bids.");
    const riskFingerprint = requestRiskFingerprintFromHeaders(await headers());
    await assertDurableRateLimit({
      key: rateLimitKey("bid.submit", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = bidInputSchema.safeParse({
      projectId,
      proposedAmount,
      estimatedDays,
      technicalApproach,
      proposedTechStack,
      techStackReason,
      proposedMilestones,
      requiredEscrowPct,
    });
    if (!parsed.success) {
      return { success: false, code: "INVALID_BID", error: getBidValidationMessage(parsed.error.flatten().fieldErrors) };
    }
    const input = parsed.data;

    // Block bids from facilitators who haven't completed onboarding
    const facilitatorProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboarding_complete: true },
    });
    if (!facilitatorProfile?.onboarding_complete) {
      throw new Error("Please complete your profile setup before submitting bids.");
    }

    const targetProject = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: {
        status: true,
        creator_id: true,
        client_id: true,
        account_risk_signals: {
          where: { event_type: "PROJECT_POSTED" },
          select: { hashed_ip: true, user_agent_hash: true },
          take: 3,
          orderBy: { created_at: "desc" },
        },
        invites: {
          where: { facilitator_id: user.id, status: { in: ["SENT", "VIEWED", "ACCEPTED"] } },
          select: { id: true, status: true },
          take: 1,
        },
      },
    });
    if (!targetProject || targetProject.status !== "OPEN_BIDDING") {
      throw new Error("This project is no longer accepting bids.");
    }
    const bidRisk = assessBidSelfDealingRisk({
      bidderId: user.id,
      projectCreatorId: targetProject.creator_id,
      projectClientId: targetProject.client_id,
      fingerprint: riskFingerprint,
      projectPostingSignals: targetProject.account_risk_signals,
      isInvited: targetProject.invites.length > 0,
    });
    if (bidRisk.severity === "BLOCK") {
      throw new Error("This bid cannot be submitted because the buyer and facilitator accounts appear to be the same account.");
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
        proposed_amount: input.proposedAmount,
        estimated_days: input.estimatedDays,
        technical_approach: input.technicalApproach,
        proposed_tech_stack: input.proposedTechStack || null,
        tech_stack_reason: input.techStackReason || null,
        proposed_milestones: input.proposedMilestones ? JSON.stringify(input.proposedMilestones) : undefined,
        ai_translation_summary: "Pending AI analysis...",
        required_escrow_pct: input.requiredEscrowPct ?? 100,
        status: "PENDING",
      },
    });

    const activeInvite = targetProject.invites[0];
    if (activeInvite && activeInvite.status !== "ACCEPTED") {
      await prisma.projectInvite.update({
        where: { id: activeInvite.id },
        data: {
          status: "ACCEPTED",
          viewed_at: new Date(),
          responded_at: new Date(),
        },
      });

      await recordActivity({
        projectId,
        actorId: user.id,
        action: "INVITE_RESPONDED",
        entityType: "ProjectInvite",
        entityId: activeInvite.id,
        metadata: {
          status: "ACCEPTED",
          operation: "INVITE_ACCEPTED_BY_PROPOSAL",
          bid_id: bid.id,
        },
      });
    }

    await recordActivity({
      projectId,
      actorId: user.id,
      bidId: bid.id,
      action: "BID_SUBMITTED",
      entityType: "Bid",
      entityId: bid.id,
      metadata: {
        proposed_amount: input.proposedAmount,
        estimated_days: input.estimatedDays,
        escrow_pct: input.requiredEscrowPct ?? 100,
      },
    });

    await recordAccountRiskSignal({
      eventType: "BID_SUBMITTED",
      severity: "INFO",
      userId: user.id,
      counterpartyId: targetProject.client_id,
      projectId,
      bidId: bid.id,
      fingerprint: riskFingerprint,
      reason: "Bid submitted. Hashed request signals captured for abuse review only.",
      metadata: {
        linked_signals: bidRisk.linkedSignals,
        invited: targetProject.invites.length > 0,
      },
    });

    if (bidRisk.severity === "REVIEW") {
      await recordAccountRiskSignal({
        eventType: "SELF_DEALING_REVIEW",
        severity: "REVIEW",
        userId: user.id,
        counterpartyId: targetProject.client_id,
        projectId,
        bidId: bid.id,
        fingerprint: riskFingerprint,
        reason: bidRisk.reason,
        metadata: {
          linked_signals: bidRisk.linkedSignals,
          invited: targetProject.invites.length > 0,
        },
      });

      await recordActivity({
        projectId,
        actorId: user.id,
        bidId: bid.id,
        action: "SYSTEM_EVENT",
        entityType: "AccountRiskSignal",
        entityId: bid.id,
        metadata: {
          operation: "SELF_DEALING_REVIEW",
          linked_signals: bidRisk.linkedSignals,
          buyer_visible: false,
        },
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { email: true, notify_new_proposals: true } },
        milestones: true,
      },
    });

    if (project) {
      const scoreCard = buildBidScoreCard({
        project,
        proposedAmount: input.proposedAmount,
        estimatedDays: input.estimatedDays,
        technicalApproach: input.technicalApproach,
        proposedTechStack: input.proposedTechStack,
        proposedMilestones: input.proposedMilestones,
      });

      await prisma.bid.update({
        where: { id: bid.id },
        data: {
          ai_score_card: scoreCard,
          ai_translation_summary: summarizeBidScoreCard(scoreCard),
        },
      });
    }

    if (project?.client?.email && shouldSendEmailForPreference("NEW_PROPOSAL", project.client)) {
      sendNewBidAlert({
        clientEmail: project.client.email,
        projectId: project.id,
        projectTitle: project.title,
      }).catch(() => {});
    }

    revalidatePath("/marketplace");
    revalidatePath(`/marketplace/project/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, bidId: bid.id };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    return { success: false, code: "BID_SUBMIT_FAILED", error: error.message };
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
    if (!bid) throw new Error("Bid not found.");
    await assertProjectBuyerManager(bid.project_id, user.id);
    const buyerAudit = await getProjectBuyerActivityMetadata(bid.project_id, user.id);
    if (bid.status !== "PENDING") throw new Error("Only pending bids can be shortlisted.");

    await prisma.bid.update({
      where: { id: bidId },
      data: { status: "SHORTLISTED" },
    });
    await recordActivity({
      projectId: bid.project_id,
      actorId: user.id,
      bidId,
      action: "BID_SHORTLISTED",
      entityType: "Bid",
      entityId: bidId,
      metadata: buyerAudit,
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
    if (!bid) throw new Error("Bid not found.");
    await assertProjectBuyerManager(bid.project_id, user.id);
    const buyerAudit = await getProjectBuyerActivityMetadata(bid.project_id, user.id);

    // Check no other active negotiation on this project
    if (bid.project.status !== "OPEN_BIDDING") {
      throw new Error("This project is no longer accepting proposal decisions.");
    }
    if (bid.project.active_bid_id && bid.project.active_bid_id !== bidId) {
      throw new Error("A negotiation is already in progress on this project. Close it first.");
    }
    if (!["PENDING", "SHORTLISTED", "UNDER_NEGOTIATION"].includes(bid.status)) {
      throw new Error("This proposal is no longer available for negotiation.");
    }

    await prisma.$transaction(async (tx) => {
      const reservedProject = await tx.project.updateMany({
        where: {
          id: bid.project_id,
          status: "OPEN_BIDDING",
          OR: [{ active_bid_id: null }, { active_bid_id: bidId }],
        },
        data: { active_bid_id: bidId },
      });
      if (reservedProject.count !== 1) {
        throw new Error("A negotiation is already in progress on this project. Close it first.");
      }

      await tx.bid.update({ where: { id: bidId }, data: { status: "UNDER_NEGOTIATION" } });
    });
    await recordActivity({
      projectId: bid.project_id,
      actorId: user.id,
      bidId,
      action: "NEGOTIATION_STARTED",
      entityType: "Bid",
      entityId: bidId,
      metadata: buyerAudit,
    });

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
    if (!bid) throw new Error("Bid not found.");
    await assertProjectBuyerManager(bid.project_id, user.id);
    const buyerAudit = await getProjectBuyerActivityMetadata(bid.project_id, user.id);
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
    await recordActivity({
      projectId: bid.project_id,
      actorId: user.id,
      bidId,
      action: "BID_COUNTERED",
      entityType: "Bid",
      entityId: bidId,
      metadata: { ...buyerAudit, counter_amount: counterAmount, counter_escrow_pct: counterEscrowPct ?? null },
    });

    // Notify facilitator
    if (bid.developer?.email) {
      sendBidCounterAlert({
        facilitatorEmail: bid.developer.email,
        projectTitle: bid.project.title,
        counterAmount,
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
        include: {
          developer: { select: { stripe_account_id: true, verifications: { select: { type: true, status: true } } } },
          project: { include: { milestones: true } },
        },
      });
      if (!bid || bid.developer_id !== user.id) throw new Error("Not your bid.");
      if (bid.status !== "UNDER_NEGOTIATION") throw new Error("Bid is no longer in negotiation.");
      const awardReadiness = getFacilitatorAwardReadiness(bid.developer);
      if (!awardReadiness.ok) throw new Error(awardReadiness.error);

      const finalAmount = bid.counter_amount ? Number(bid.counter_amount) : Number(bid.proposed_amount);
      projectId = bid.project_id;

      const reservedProject = await tx.project.updateMany({
        where: {
          id: projectId,
          status: "OPEN_BIDDING",
          active_bid_id: bidId,
        },
        data: { status: "ACTIVE", active_bid_id: null },
      });
      if (reservedProject.count !== 1) {
        throw new Error("This project has already moved out of active negotiation.");
      }

      // Accept this bid
      await tx.bid.update({ where: { id: bidId }, data: { status: "ACCEPTED", proposed_amount: finalAmount } });

      // Reject all other bids
      await tx.bid.updateMany({
        where: { project_id: projectId, id: { not: bidId } },
        data: { status: "REJECTED" },
      });

      // Rescale milestones to counter amount if custom milestones provided
      const milestonesToUse = parseStoredMilestones(bid.counter_milestones);

      if (milestonesToUse && milestonesToUse.length > 0) {
        // Delete existing milestones and create proposed ones
        await tx.milestone.deleteMany({ where: { project_id: projectId } });
        for (const m of milestonesToUse) {
          await tx.milestone.create({
            data: {
              project_id: projectId,
              facilitator_id: user.id,
              title: m.title || "Milestone",
              amount: Number(m.amount ?? 0),
              estimated_duration_days: Number(m.days ?? 1),
              description: m.description || null,
              status: "PENDING",
              acceptance_criteria: stringList(m.acceptance_criteria),
              deliverables: stringList(m.deliverables),
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
    });

    await recordActivity({
      projectId,
      actorId: user.id,
      bidId,
      action: "BID_ACCEPTED",
      entityType: "Bid",
      entityId: bidId,
      metadata: { accepted_by: "FACILITATOR" },
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
      select: { project_id: true, developer: { select: { email: true } }, project: { select: { title: true } } },
    });
    if (!bidForEmail) throw new Error("Bid not found.");
    await assertProjectBuyerManager(bidForEmail.project_id, user.id);
    const buyerAudit = await getProjectBuyerActivityMetadata(bidForEmail.project_id, user.id);

    let projectId!: string;
    let developerEmail: string | null | undefined;
    let projectTitle: string = "";

    await prisma.$transaction(async (tx) => {
      // ── Re-read inside the transaction to close the TOCTOU window ──────────
      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        include: {
          developer: { select: { stripe_account_id: true, verifications: { select: { type: true, status: true } } } },
          project: { include: { milestones: true } },
        },
      });
      if (!bid || bid.project.status !== "OPEN_BIDDING") {
        throw new Error("Cannot accept this bid.");
      }
      if (!["PENDING", "SHORTLISTED", "UNDER_NEGOTIATION"].includes(bid.status)) {
        throw new Error("This proposal is no longer available to accept.");
      }
      if (bid.project.active_bid_id && bid.project.active_bid_id !== bidId) {
        throw new Error("Another proposal is already in active negotiation.");
      }
      const awardReadiness = getFacilitatorAwardReadiness(bid.developer);
      if (!awardReadiness.ok) throw new Error(awardReadiness.error);

      projectId = bid.project_id;
      developerEmail = bidForEmail?.developer?.email;
      projectTitle = bidForEmail?.project?.title ?? "";
      const proposedAmount = Number(bid.proposed_amount);
      const proposedMilestones = parseStoredMilestones(bid.proposed_milestones);

      const reservedProject = await tx.project.updateMany({
        where: {
          id: projectId,
          status: "OPEN_BIDDING",
          OR: [{ active_bid_id: null }, { active_bid_id: bidId }],
        },
        data: { status: "ACTIVE", active_bid_id: null },
      });
      if (reservedProject.count !== 1) {
        throw new Error("This project has already been awarded.");
      }

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
              title: m.title || "Milestone",
              amount: Number(m.amount ?? 0),
              estimated_duration_days: Number(m.days ?? 1),
              description: m.description || null,
              status: "PENDING",
              acceptance_criteria: stringList(m.acceptance_criteria),
              deliverables: stringList(m.deliverables),
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
    });

    if (developerEmail) {
      sendBidAcceptedAlert({
        facilitatorEmail: developerEmail,
        projectId,
        projectTitle,
      }).catch(() => {});
    }

    await recordActivity({
      projectId,
      actorId: user.id,
      bidId,
      action: "BID_ACCEPTED",
      entityType: "Bid",
      entityId: bidId,
      metadata: { ...buyerAudit, accepted_by: "CLIENT" },
    });

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

    const isClient = user.role === "CLIENT" && await userCanManageBuyerProject(bid.project_id, user.id);
    const isFacilitator = user.role === "FACILITATOR" && bid.developer_id === user.id;
    if (!isClient && !isFacilitator) throw new Error("Unauthorized.");
    const buyerAudit = isClient ? await getProjectBuyerActivityMetadata(bid.project_id, user.id) : null;

    await prisma.$transaction([
      prisma.bid.update({ where: { id: bidId }, data: { status: "REJECTED" } }),
      prisma.project.update({ where: { id: bid.project_id }, data: { active_bid_id: null } }),
    ]);

    await recordActivity({
      projectId: bid.project_id,
      actorId: user.id,
      bidId,
      action: "SYSTEM_EVENT",
      entityType: "Bid",
      entityId: bidId,
      metadata: {
        ...(buyerAudit ?? { actor_scope: "FACILITATOR", actor_project_role: "FACILITATOR", workspace_admin_action: false }),
        operation: "BID_REJECTED",
      },
    });

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
    if (!project) throw new Error("Project not found.");
    await assertProjectBuyerManager(projectId, user.id);
    const buyerAudit = await getProjectBuyerActivityMetadata(projectId, user.id);

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
    await recordActivity({
      projectId,
      actorId: user.id,
      action: "SYSTEM_EVENT",
      entityType: "Project",
      entityId: projectId,
      metadata: { ...buyerAudit, operation: "BIDDING_REOPENED" },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
