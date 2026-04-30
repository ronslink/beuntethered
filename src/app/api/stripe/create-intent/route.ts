import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { createStripeClient, isPaymentConfigurationError } from "@/lib/stripe";
import { userCanManageBuyerProject } from "@/lib/project-access";
import {
  getPaymentRecordClientId,
  paymentError,
  validateMilestoneFundingReadiness,
} from "@/lib/payment-route";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { milestonePaymentInputSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return paymentError({ error: "Only client accounts can fund milestone escrow.", code: "UNAUTHORIZED", status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.create-intent", user.id),
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
      include: { project: true }
    });

    if (!milestone) {
      return paymentError({ error: "Milestone not found.", code: "MILESTONE_NOT_FOUND", status: 404 });
    }

    if (!await userCanManageBuyerProject(milestone.project_id, user.id)) {
      return paymentError({ error: "You need buyer admin access to fund this milestone.", code: "PAYMENT_ACCESS_DENIED", status: 403 });
    }

    const fundingReadiness = validateMilestoneFundingReadiness(milestone);
    if (!fundingReadiness.ok) {
      return paymentError(fundingReadiness);
    }

    const fees = calculateMilestoneFees({
      amount: Number(milestone.amount),
      isByoc: milestone.project.is_byoc,
    });

    // Create PaymentIntent holding funds explicitly on the platform side of the ledger
    const stripe = createStripeClient();
    const intent = await stripe.paymentIntents.create({
      amount: fees.clientTotalCents,
      currency: "usd",
      payment_method_types: ["card", "us_bank_account"],
      transfer_group: `milestone_${milestone.id}`,
      metadata: {
        milestone_id: milestone.id,
        project_id: milestone.project.id,
        platform_fee_cents: String(fees.platformFeeCents),
        milestone_amount_cents: String(fees.grossAmountCents),
      }
    }, {
      idempotencyKey: `fund_intent_${milestone.id}`,
    });

    await prisma.paymentRecord.upsert({
      where: { idempotency_key: `fund_${milestone.id}` },
      update: {
        status: "PENDING",
        stripe_payment_intent_id: intent.id,
        gross_amount_cents: fees.grossAmountCents,
        platform_fee_cents: fees.platformFeeCents,
        facilitator_payout_cents: fees.facilitatorPayoutCents,
      },
      create: {
        project_id: milestone.project.id,
        milestone_id: milestone.id,
        client_id: getPaymentRecordClientId({ projectClientId: milestone.project.client_id, actorId: user.id }),
        facilitator_id: milestone.facilitator_id,
        kind: "MILESTONE_FUNDING",
        status: "PENDING",
        gross_amount_cents: fees.grossAmountCents,
        platform_fee_cents: fees.platformFeeCents,
        facilitator_payout_cents: fees.facilitatorPayoutCents,
        stripe_payment_intent_id: intent.id,
        idempotency_key: `fund_${milestone.id}`,
        metadata: { fee_rate: fees.feeRate },
      },
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
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
      error: "Unable to create escrow payment intent.",
      code: "PAYMENT_OPERATION_FAILED",
      status: 500,
    });
  }
}
