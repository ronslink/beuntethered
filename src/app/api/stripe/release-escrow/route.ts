import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { generateSignedDownloadUrl } from "@/lib/storage";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { recordActivity } from "@/lib/activity";
import { RELEASABLE_MILESTONE_STATUSES } from "@/lib/milestone-state";
import { createStripeClient, isPaymentConfigurationError } from "@/lib/stripe";
import { escrowReleaseInputSchema } from "@/lib/validators";
import { userCanManageBuyerProject } from "@/lib/project-access";
import {
  getPaymentRecordClientId,
  paymentError,
  validateFacilitatorPayoutReadiness,
} from "@/lib/payment-route";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { getAuditReleaseStatusFromLatestAudit, getReviewReleaseState } from "@/lib/review-release-rules";
import { notifyTrustEvent } from "@/lib/trust-notifications";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // Escrow releases strictly originate from client approval operations
    if (!user || user.role !== "CLIENT") {
      return paymentError({ error: "Only client accounts can release escrow.", code: "UNAUTHORIZED", status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.release-escrow", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = escrowReleaseInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return paymentError({
        error: "Complete the approval checklist before releasing escrow.",
        code: "APPROVAL_ATTESTATION_REQUIRED",
        status: 400,
      });
    }

    const { milestoneId, approvalAttestation } = parsed.data;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { 
        project: true,
        facilitator: { include: { verifications: true } },
        audits: { orderBy: { created_at: "desc" }, take: 1 },
      }
    });

    if (!milestone) {
      return paymentError({ error: "Milestone not found.", code: "MILESTONE_NOT_FOUND", status: 404 });
    }

    if (!await userCanManageBuyerProject(milestone.project_id, user.id)) {
      return paymentError({ error: "You need buyer admin access to release this milestone.", code: "PAYMENT_ACCESS_DENIED", status: 403 });
    }

    const actualAuditStatus = getAuditReleaseStatusFromLatestAudit(milestone.audits[0]);
    const releaseState = getReviewReleaseState({
      testedPreview: approvalAttestation.testedPreview,
      reviewedEvidence: approvalAttestation.reviewedEvidence,
      acceptsRelease: approvalAttestation.acceptsPaymentRelease,
      auditStatus: actualAuditStatus,
      failedAuditOverrideAccepted: approvalAttestation.failedAuditOverrideAccepted,
      failedAuditOverrideReason: approvalAttestation.failedAuditOverrideReason,
    });

    if (!releaseState.canRelease) {
      return paymentError({
        error: releaseState.reason ?? "Complete the approval checklist before releasing escrow.",
        code:
          actualAuditStatus === "PENDING"
            ? "AUDIT_RESULT_REQUIRED"
            : actualAuditStatus === "FAILED"
              ? "FAILED_AUDIT_OVERRIDE_REQUIRED"
              : "APPROVAL_ATTESTATION_REQUIRED",
        status: 409,
      });
    }

    const releaseAttestation = {
      ...approvalAttestation,
      auditStatus: actualAuditStatus,
      failedAuditOverrideReason: approvalAttestation.failedAuditOverrideReason?.trim() || undefined,
    };

    const payoutReadiness = validateFacilitatorPayoutReadiness(milestone);
    if (!payoutReadiness.ok) {
      return paymentError(payoutReadiness);
    }

    // ── Atomic Check-and-Set ────────────────────────────────────────────────
    // Use updateMany with a status precondition. If another concurrent request
    // already claimed this milestone, count === 0 and we abort before Stripe.
    const claimed = await prisma.milestone.updateMany({
      where: {
        id: milestoneId,
        status: { in: RELEASABLE_MILESTONE_STATUSES },
      },
      data: { status: "APPROVED_AND_PAID", paid_at: new Date() },
    });

    if (claimed.count === 0) {
      return paymentError({
        error: "Milestone must be submitted for review before escrow can be released.",
        code: "MILESTONE_NOT_RELEASABLE",
        status: 409,
      });
    }

    // ── Stripe Payout ───────────────────────────────────────────────────────
    // Idempotency key ensures Stripe deduplicates if this endpoint is hit twice
    // (e.g. network retry or double-click) — no second transfer will be issued.
    const fees = calculateMilestoneFees({
      amount: Number(milestone.amount),
      isByoc: milestone.project.is_byoc,
    });

    let transfer;
    try {
      const stripe = createStripeClient();
      transfer = await stripe.transfers.create(
        {
          amount: fees.facilitatorPayoutCents,
          currency: "usd",
          destination: payoutReadiness.stripeAccountId,
          transfer_group: `milestone_${milestone.id}`,
          metadata: {
            milestone_id: milestone.id,
            project_id: milestone.project_id,
            platform_fee_cents: String(fees.platformFeeCents),
          },
        },
        { idempotencyKey: `release_escrow_${milestone.id}` }
      );

      await prisma.paymentRecord.upsert({
        where: { idempotency_key: `release_${milestone.id}` },
        update: {
          status: "SUCCEEDED",
          stripe_transfer_id: transfer.id,
          gross_amount_cents: fees.grossAmountCents,
          platform_fee_cents: fees.platformFeeCents,
          facilitator_payout_cents: fees.facilitatorPayoutCents,
          metadata: { fee_rate: fees.feeRate, approval_attestation: releaseAttestation },
        },
        create: {
          project_id: milestone.project_id,
          milestone_id: milestone.id,
          client_id: getPaymentRecordClientId({ projectClientId: milestone.project.client_id, actorId: user.id }),
          facilitator_id: milestone.facilitator_id,
          kind: "ESCROW_RELEASE",
          status: "SUCCEEDED",
          gross_amount_cents: fees.grossAmountCents,
          platform_fee_cents: fees.platformFeeCents,
          facilitator_payout_cents: fees.facilitatorPayoutCents,
          stripe_transfer_id: transfer.id,
          idempotency_key: `release_${milestone.id}`,
          metadata: { fee_rate: fees.feeRate, approval_attestation: releaseAttestation },
        },
      });
    } catch (stripeErr: any) {
      // Roll back the DB status update if Stripe fails
      await prisma.milestone.updateMany({
        where: { id: milestoneId, status: "APPROVED_AND_PAID" },
        data: { status: milestone.status },
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

    await recordActivity({
      projectId: milestone.project_id,
      actorId: user.id,
      milestoneId: milestone.id,
      action: "MILESTONE_APPROVED",
      entityType: "Milestone",
      entityId: milestone.id,
      metadata: {
        approved_status: "APPROVED_AND_PAID",
        approval_attestation: releaseAttestation,
        latest_audit_score: milestone.audits[0]?.score ?? null,
        latest_audit_passing: milestone.audits[0]?.is_passing ?? null,
      },
    });

    await notifyTrustEvent({
      userId: milestone.facilitator_id,
      kind: "ESCROW_RELEASED",
      projectId: milestone.project_id,
      projectTitle: milestone.project.title,
      actorRole: "FACILITATOR",
      milestoneId: milestone.id,
      metadata: {
        stripe_transfer_id: transfer.id,
        facilitator_payout_cents: fees.facilitatorPayoutCents,
      },
    });

    await recordActivity({
      projectId: milestone.project_id,
      actorId: user.id,
      milestoneId: milestone.id,
      action: "PAYMENT_RELEASED",
      entityType: "PaymentRecord",
      entityId: `release_${milestone.id}`,
      metadata: {
        stripe_transfer_id: transfer.id,
        platform_fee_cents: fees.platformFeeCents,
        facilitator_payout_cents: fees.facilitatorPayoutCents,
        approval_attestation: releaseAttestation,
      },
    });

    const remainingOpenMilestones = await prisma.milestone.count({
      where: {
        project_id: milestone.project_id,
        status: { not: "APPROVED_AND_PAID" },
      },
    });

    if (remainingOpenMilestones === 0) {
      await prisma.project.update({
        where: { id: milestone.project_id },
        data: { status: "COMPLETED" },
      });
    }

    let downloadUrl = null;
    if (milestone.payload_storage_path) {
      downloadUrl = await generateSignedDownloadUrl(milestone.payload_storage_path);
    }

    return NextResponse.json({ success: true, transfer: transfer.id, downloadUrl });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    if (isPaymentConfigurationError(error)) {
      return paymentError({ error: error.message, code: error.code, status: 503 });
    }
    return paymentError({
      error: "Unable to release escrow.",
      code: "PAYMENT_OPERATION_FAILED",
      status: 500,
    });
  }
}
