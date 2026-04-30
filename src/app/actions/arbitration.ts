"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { recordActivity } from "@/lib/activity";
import { createStripeClient, isPaymentConfigurationError } from "@/lib/stripe";
import {
  buildArbitrationEvidenceSummary,
  buildArbitrationResolutionMetadata,
  getArbitrationPaymentKeys,
  getArbitrationResolutionNoteError,
  getArbitrationStatusError,
  normalizeArbitrationResolutionNote,
} from "@/lib/arbitration-resolution";
import { buildDisputeEvidenceContext } from "@/lib/dispute-evidence";
import { validateFacilitatorPayoutReadiness } from "@/lib/payment-route-rules";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { notifyTrustEvent } from "@/lib/trust-notifications";
import { BYOC_DISPUTE_EXCLUSION_MESSAGE } from "@/lib/dispute-rules";

/**
 * Validates platform administrator dispute permissions.
 */
async function enforceArbiterPermissions() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    throw new Error("You are not authorized to resolve disputes.");
  }
  return user;
}

export async function resolveDisputeForClient(disputeId: string, resolutionNoteInput?: string) {
  try {
    const arbiter = await enforceArbiterPermissions();
    await assertDurableRateLimit({
      key: rateLimitKey("arbitration.resolve-client", arbiter.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const resolutionNote = normalizeArbitrationResolutionNote(resolutionNoteInput);
    const noteError = getArbitrationResolutionNoteError(resolutionNote);
    if (noteError) throw new Error(noteError);

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        milestone: {
          include: {
            audits: { orderBy: { created_at: "desc" }, take: 1 },
            attachments: { orderBy: { created_at: "desc" } },
            payment_records: { orderBy: { created_at: "desc" } },
            activity_logs: { orderBy: { created_at: "desc" }, take: 10 },
          },
        },
        project: true,
      }
    });

    if (!dispute || dispute.status !== "OPEN") throw new Error("This dispute is no longer open.");
    if (dispute.project.is_byoc) throw new Error(BYOC_DISPUTE_EXCLUSION_MESSAGE);
    const statusError = getArbitrationStatusError(dispute.milestone.status, "CLIENT");
    if (statusError) throw new Error(statusError);

    const fundedPayment = dispute.milestone.payment_records.find(
      (record) =>
        record.kind === "MILESTONE_FUNDING" &&
        record.status === "SUCCEEDED" &&
        Boolean(record.stripe_payment_intent_id)
    );
    const paymentIntentId =
      dispute.milestone.stripe_payment_intent_id ||
      fundedPayment?.stripe_payment_intent_id;

    if (!paymentIntentId) {
      throw new Error("No funded Stripe payment intent is available for this disputed milestone.");
    }

    const fees = calculateMilestoneFees({
      amount: Number(dispute.milestone.amount),
      isByoc: dispute.project.is_byoc,
    });
    const paymentKeys = getArbitrationPaymentKeys(dispute.milestone.id);
    const evidenceSummary = buildArbitrationEvidenceSummary(buildDisputeEvidenceContext(dispute.milestone));

    const claimed = await prisma.dispute.updateMany({
      where: { id: dispute.id, status: "OPEN" },
      data: { status: "RESOLVED_CLIENT" },
    });
    if (claimed.count === 0) throw new Error("This dispute is no longer open.");

    const stripe = createStripeClient();
    let refund;
    try {
      refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          metadata: {
            milestone_id: dispute.milestone.id,
            project_id: dispute.project_id,
            dispute_id: dispute.id,
            arbitration_refund: "true",
          },
        },
        { idempotencyKey: paymentKeys.refundStripeIdempotencyKey }
      );
    } catch (stripeErr) {
      await prisma.dispute.updateMany({
        where: { id: dispute.id, status: "RESOLVED_CLIENT" },
        data: { status: "OPEN" },
      });
      throw stripeErr;
    }
    const refundMetadata = buildArbitrationResolutionMetadata({
      standing: "CLIENT",
      disputeId: dispute.id,
      arbiterId: arbiter.id,
      stripeId: refund.id,
      platformFeeCents: fees.platformFeeCents,
      counterpartyAmountCents: fees.clientTotalCents,
      latestAuditScore: dispute.milestone.audits[0]?.score ?? null,
      latestAuditPassing: dispute.milestone.audits[0]?.is_passing ?? null,
      resolutionNote,
      evidenceSummary,
    });

    await prisma.$transaction([
      prisma.paymentRecord.upsert({
        where: { idempotency_key: paymentKeys.refundRecordKey },
        update: {
          status: "SUCCEEDED",
          stripe_refund_id: refund.id,
          stripe_payment_intent_id: paymentIntentId,
          gross_amount_cents: fees.clientTotalCents,
          platform_fee_cents: fees.platformFeeCents,
          facilitator_payout_cents: 0,
          metadata: {
            fee_rate: fees.feeRate,
            arbitration_refund: true,
            dispute_id: dispute.id,
            arbiter_id: arbiter.id,
            payment_intent_id: paymentIntentId,
            resolution_note: resolutionNote,
            evidence_summary: evidenceSummary,
          },
        },
        create: {
          project_id: dispute.project_id,
          milestone_id: dispute.milestone_id,
          client_id: dispute.client_id,
          facilitator_id: dispute.facilitator_id,
          kind: "REFUND",
          status: "SUCCEEDED",
          gross_amount_cents: fees.clientTotalCents,
          platform_fee_cents: fees.platformFeeCents,
          facilitator_payout_cents: 0,
          stripe_payment_intent_id: paymentIntentId,
          stripe_refund_id: refund.id,
          idempotency_key: paymentKeys.refundRecordKey,
          metadata: {
            fee_rate: fees.feeRate,
            arbitration_refund: true,
            dispute_id: dispute.id,
            arbiter_id: arbiter.id,
            payment_intent_id: paymentIntentId,
            resolution_note: resolutionNote,
            evidence_summary: evidenceSummary,
          },
        },
      }),
      prisma.paymentRecord.updateMany({
        where: { milestone_id: dispute.milestone_id, kind: "MILESTONE_FUNDING" },
        data: {
          status: "CANCELLED",
          stripe_refund_id: refund.id,
        },
      }),
      // Reset milestone so the client can re-fund after the Stripe refund clears
      prisma.milestone.updateMany({
        where: { id: dispute.milestone_id, status: "DISPUTED" },
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
          description: `Arbitration resolved in favor of Client. Escrow refunded. Milestone reset to PENDING. Arbiter: ${arbiter.name || "System"}`,
          author: "Admin Authority"
        }
      })
    ]);

    await recordActivity({
      projectId: dispute.project_id,
      actorId: arbiter.id,
      milestoneId: dispute.milestone_id,
      action: "SYSTEM_EVENT",
      entityType: "PaymentRecord",
      entityId: paymentKeys.refundRecordKey,
      metadata: {
        ...refundMetadata,
        payment_intent_id: paymentIntentId,
      },
    });

    await recordActivity({
      projectId: dispute.project_id,
      actorId: arbiter.id,
      milestoneId: dispute.milestone_id,
      action: "DISPUTE_RESOLVED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: {
        standing: "CLIENT",
        arbitration_refund: true,
        resolution_note: resolutionNote,
        evidence_summary: evidenceSummary,
      },
    });

    await Promise.all([
      notifyTrustEvent({
        userId: dispute.client_id,
        kind: "DISPUTE_RESOLVED",
        projectId: dispute.project_id,
        projectTitle: dispute.project.title,
        actorRole: "SYSTEM",
        milestoneId: dispute.milestone_id,
        disputeId: dispute.id,
        standing: "CLIENT",
        metadata: refundMetadata,
      }),
      notifyTrustEvent({
        userId: dispute.facilitator_id,
        kind: "DISPUTE_RESOLVED",
        projectId: dispute.project_id,
        projectTitle: dispute.project.title,
        actorRole: "SYSTEM",
        milestoneId: dispute.milestone_id,
        disputeId: dispute.id,
        standing: "CLIENT",
        metadata: refundMetadata,
      }),
    ]);

    revalidatePath("/admin/disputes");
    revalidatePath(`/command-center/${dispute.project_id}`);
    
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    if (isPaymentConfigurationError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message };
  }
}

export async function resolveDisputeForFacilitator(disputeId: string, resolutionNoteInput?: string) {
  try {
    const arbiter = await enforceArbiterPermissions();
    await assertDurableRateLimit({
      key: rateLimitKey("arbitration.resolve-facilitator", arbiter.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const resolutionNote = normalizeArbitrationResolutionNote(resolutionNoteInput);
    const noteError = getArbitrationResolutionNoteError(resolutionNote);
    if (noteError) throw new Error(noteError);

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        milestone: {
          include: {
            facilitator: { include: { verifications: true } },
            audits: { orderBy: { created_at: "desc" }, take: 1 },
            attachments: { orderBy: { created_at: "desc" } },
            payment_records: { orderBy: { created_at: "desc" } },
            activity_logs: { orderBy: { created_at: "desc" }, take: 10 },
          },
        },
        project: true,
      }
    });

    if (!dispute || dispute.status !== "OPEN") throw new Error("This dispute is no longer open.");
    if (dispute.project.is_byoc) throw new Error(BYOC_DISPUTE_EXCLUSION_MESSAGE);
    const statusError = getArbitrationStatusError(dispute.milestone.status, "FACILITATOR");
    if (statusError) throw new Error(statusError);

    const payoutReadiness = validateFacilitatorPayoutReadiness(dispute.milestone);
    if (!payoutReadiness.ok) throw new Error(payoutReadiness.error);
    const facilitatorAccountId = payoutReadiness.stripeAccountId;

    const fees = calculateMilestoneFees({
      amount: Number(dispute.milestone.amount),
      isByoc: dispute.project.is_byoc,
    });
    const paymentKeys = getArbitrationPaymentKeys(dispute.milestone.id);
    const evidenceSummary = buildArbitrationEvidenceSummary(buildDisputeEvidenceContext(dispute.milestone));

    const claimed = await prisma.dispute.updateMany({
      where: { id: dispute.id, status: "OPEN" },
      data: { status: "RESOLVED_FACILITATOR" },
    });
    if (claimed.count === 0) throw new Error("This dispute is no longer open.");

    const stripe = createStripeClient();
    let transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: fees.facilitatorPayoutCents,
          currency: "usd",
          destination: facilitatorAccountId,
          transfer_group: `milestone_${dispute.milestone.id}`,
          metadata: {
            milestone_id: dispute.milestone.id,
            project_id: dispute.project_id,
            dispute_id: dispute.id,
            platform_fee_cents: String(fees.platformFeeCents),
            arbitration_release: "true",
          },
        },
        { idempotencyKey: paymentKeys.releaseStripeIdempotencyKey }
      );
    } catch (stripeErr) {
      await prisma.dispute.updateMany({
        where: { id: dispute.id, status: "RESOLVED_FACILITATOR" },
        data: { status: "OPEN" },
      });
      throw stripeErr;
    }
    const releaseMetadata = buildArbitrationResolutionMetadata({
      standing: "FACILITATOR",
      disputeId: dispute.id,
      arbiterId: arbiter.id,
      stripeId: transfer.id,
      platformFeeCents: fees.platformFeeCents,
      counterpartyAmountCents: fees.facilitatorPayoutCents,
      latestAuditScore: dispute.milestone.audits[0]?.score ?? null,
      latestAuditPassing: dispute.milestone.audits[0]?.is_passing ?? null,
      resolutionNote,
      evidenceSummary,
    });

    // Resolve the milestone in favor of the facilitator.
    await prisma.$transaction([
        prisma.milestone.updateMany({
            where: { id: dispute.milestone_id, status: "DISPUTED" },
            data: { status: "APPROVED_AND_PAID", paid_at: new Date() }
        }),
        prisma.paymentRecord.upsert({
            where: { idempotency_key: paymentKeys.releaseRecordKey },
            update: {
              status: "SUCCEEDED",
              stripe_transfer_id: transfer.id,
              gross_amount_cents: fees.grossAmountCents,
              platform_fee_cents: fees.platformFeeCents,
              facilitator_payout_cents: fees.facilitatorPayoutCents,
              metadata: {
                fee_rate: fees.feeRate,
                arbitration_release: true,
                dispute_id: dispute.id,
                arbiter_id: arbiter.id,
                resolution_note: resolutionNote,
                evidence_summary: evidenceSummary,
              },
            },
            create: {
              project_id: dispute.project_id,
              milestone_id: dispute.milestone_id,
              client_id: dispute.client_id,
              facilitator_id: dispute.facilitator_id,
              kind: "ESCROW_RELEASE",
              status: "SUCCEEDED",
              gross_amount_cents: fees.grossAmountCents,
              platform_fee_cents: fees.platformFeeCents,
              facilitator_payout_cents: fees.facilitatorPayoutCents,
              stripe_transfer_id: transfer.id,
              idempotency_key: paymentKeys.releaseRecordKey,
              metadata: {
                fee_rate: fees.feeRate,
                arbitration_release: true,
                dispute_id: dispute.id,
                arbiter_id: arbiter.id,
                resolution_note: resolutionNote,
                evidence_summary: evidenceSummary,
              },
            },
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
              description: `Arbitration resolved in favor of Facilitator. Payment released by ${arbiter.name || 'System'}.`,
              author: "Admin Authority"
            }
        })
    ]);

    await recordActivity({
      projectId: dispute.project_id,
      actorId: arbiter.id,
      milestoneId: dispute.milestone_id,
      action: "PAYMENT_RELEASED",
      entityType: "PaymentRecord",
      entityId: paymentKeys.releaseRecordKey,
      metadata: {
        ...releaseMetadata,
      },
    });

    await recordActivity({
      projectId: dispute.project_id,
      actorId: arbiter.id,
      milestoneId: dispute.milestone_id,
      action: "DISPUTE_RESOLVED",
      entityType: "Dispute",
      entityId: dispute.id,
      metadata: {
        standing: "FACILITATOR",
        arbitration_release: true,
        resolution_note: resolutionNote,
        evidence_summary: evidenceSummary,
      },
    });

    await Promise.all([
      notifyTrustEvent({
        userId: dispute.client_id,
        kind: "DISPUTE_RESOLVED",
        projectId: dispute.project_id,
        projectTitle: dispute.project.title,
        actorRole: "SYSTEM",
        milestoneId: dispute.milestone_id,
        disputeId: dispute.id,
        standing: "FACILITATOR",
        metadata: releaseMetadata,
      }),
      notifyTrustEvent({
        userId: dispute.facilitator_id,
        kind: "DISPUTE_RESOLVED",
        projectId: dispute.project_id,
        projectTitle: dispute.project.title,
        actorRole: "SYSTEM",
        milestoneId: dispute.milestone_id,
        disputeId: dispute.id,
        standing: "FACILITATOR",
        metadata: releaseMetadata,
      }),
    ]);

    const remainingOpenMilestones = await prisma.milestone.count({
      where: {
        project_id: dispute.project_id,
        status: { not: "APPROVED_AND_PAID" },
      },
    });

    if (remainingOpenMilestones === 0) {
      await prisma.project.update({
        where: { id: dispute.project_id },
        data: { status: "COMPLETED" },
      });
    }

    revalidatePath("/admin/disputes");
    revalidatePath(`/command-center/${dispute.project_id}`);
    
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    if (isPaymentConfigurationError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message };
  }
}
