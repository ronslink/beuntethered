import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { createStripeClient, isPaymentConfigurationError } from "@/lib/stripe";
import { getPaymentRecordClientId, paymentError } from "@/lib/payment-route";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { milestonePaymentInputSchema } from "@/lib/validators";
import { canRefundMilestone } from "@/lib/milestone-state";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // We only allow platform administrators to drive raw refunds
    if (!user || !isPlatformAdminEmail(user.email)) {
      return paymentError({ error: "Platform arbiter permissions are required.", code: "UNAUTHORIZED", status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.refund", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = milestonePaymentInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return paymentError({ error: "Milestone ID is required.", code: "INVALID_PAYMENT_REQUEST", status: 400 });
    }
    const { milestoneId } = parsed.data;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone || !milestone.stripe_payment_intent_id) {
      return paymentError({ error: "Milestone is not funded or could not be found.", code: "MILESTONE_NOT_FOUND", status: 404 });
    }

    if (!canRefundMilestone(milestone.status)) {
       return paymentError({ error: "Refunds can only be executed on disputed milestones.", code: "MILESTONE_NOT_RELEASABLE", status: 409 });
    }

    const fees = calculateMilestoneFees({
      amount: Number(milestone.amount),
      isByoc: milestone.project.is_byoc,
    });

    const claimed = await prisma.milestone.updateMany({
      where: {
        id: milestone.id,
        status: "DISPUTED",
        stripe_payment_intent_id: milestone.stripe_payment_intent_id,
      },
      data: { status: "PENDING" },
    });
    if (claimed.count !== 1) {
      return paymentError({
        error: "This milestone refund is already in progress or no longer disputed.",
        code: "MILESTONE_NOT_RELEASABLE",
        status: 409,
      });
    }

    await prisma.paymentRecord.upsert({
      where: { idempotency_key: `refund_${milestone.id}` },
      update: {
        status: "PENDING",
        stripe_payment_intent_id: milestone.stripe_payment_intent_id,
        gross_amount_cents: fees.clientTotalCents,
        platform_fee_cents: fees.platformFeeCents,
        facilitator_payout_cents: 0,
        metadata: { fee_rate: fees.feeRate },
      },
      create: {
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        client_id: getPaymentRecordClientId({
          projectClientId: milestone.project.client_id ?? milestone.project.creator_id,
          actorId: user.id,
        }),
        facilitator_id: milestone.facilitator_id,
        kind: "REFUND",
        status: "PENDING",
        gross_amount_cents: fees.clientTotalCents,
        platform_fee_cents: fees.platformFeeCents,
        facilitator_payout_cents: 0,
        stripe_payment_intent_id: milestone.stripe_payment_intent_id,
        idempotency_key: `refund_${milestone.id}`,
        metadata: { fee_rate: fees.feeRate },
      },
    });

    let refund;
    try {
      // Trigger explicit mathematical reversal natively
      const stripe = createStripeClient();
      refund = await stripe.refunds.create(
        {
          payment_intent: milestone.stripe_payment_intent_id,
          metadata: {
            milestone_id: milestone.id,
            project_id: milestone.project_id,
          },
        },
        { idempotencyKey: `refund_${milestone.id}` }
      );
    } catch (stripeErr) {
      await prisma.milestone.updateMany({
        where: { id: milestone.id, status: "PENDING", stripe_payment_intent_id: milestone.stripe_payment_intent_id },
        data: { status: "DISPUTED" },
      });
      await prisma.paymentRecord.updateMany({
        where: { idempotency_key: `refund_${milestone.id}` },
        data: { status: "FAILED" },
      });
      throw stripeErr;
    }

    await prisma.paymentRecord.update({
      where: { idempotency_key: `refund_${milestone.id}` },
      data: {
        status: "SUCCEEDED",
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: milestone.stripe_payment_intent_id,
      },
    });

    await prisma.paymentRecord.updateMany({
      where: { milestone_id: milestone.id, kind: "MILESTONE_FUNDING" },
      data: {
        status: "CANCELLED",
        stripe_refund_id: refund.id,
      },
    });

    // Unbind the local escrow marker once Stripe has accepted the refund.
    await prisma.milestone.updateMany({
      where: { id: milestone.id, status: "PENDING", stripe_payment_intent_id: milestone.stripe_payment_intent_id },
      data: {
        stripe_payment_intent_id: null
      },
    });

    await recordActivity({
      projectId: milestone.project_id,
      actorId: user.id,
      milestoneId: milestone.id,
      action: "SYSTEM_EVENT",
      entityType: "PaymentRecord",
      entityId: `refund_${milestone.id}`,
      metadata: {
        operation: "ESCROW_REFUNDED",
        stripe_refund_id: refund.id,
      },
    });

    return NextResponse.json({ success: true, refund_id: refund.id });
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
    console.error("Escrow Refund Failure Matrix:", error);
    return paymentError({
      error: "Unable to refund escrow.",
      code: "PAYMENT_OPERATION_FAILED",
      status: 500,
    });
  }
}
