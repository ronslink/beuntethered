import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { calculateMilestoneFees } from "@/lib/platform-fees";
import { createStripeClient, getAppBaseUrl, isPaymentConfigurationError } from "@/lib/stripe";
import { userCanManageBuyerProject } from "@/lib/project-access";
import {
  getPendingCheckoutBlock,
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
      key: rateLimitKey("stripe.checkout", user.id),
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

    const pendingFundingRecord = await prisma.paymentRecord.findFirst({
      where: {
        milestone_id: milestone.id,
        kind: "MILESTONE_FUNDING",
        status: "PENDING",
      },
      select: {
        status: true,
        stripe_checkout_session_id: true,
        updated_at: true,
      },
      orderBy: { updated_at: "desc" },
    });
    const pendingCheckout = getPendingCheckoutBlock({ pendingFundingRecord });
    if (pendingCheckout.blocked) {
      return paymentError(pendingCheckout);
    }

    const fundingReadiness = validateMilestoneFundingReadiness(milestone);
    if (!fundingReadiness.ok) {
      return paymentError(fundingReadiness);
    }

    const fees = calculateMilestoneFees({
      amount: Number(milestone.amount),
      isByoc: milestone.project.is_byoc,
    });

    const stripe = createStripeClient();
    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Untether Escrow: ${milestone.project.title}`,
              description: `Milestone Funding: ${milestone.title}`,
            },
            unit_amount: fees.clientTotalCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
         metadata: {
            milestone_id: milestone.id,
            project_id: milestone.project.id,
            billing_type: milestone.project.billing_type,
            platform_fee_cents: String(fees.platformFeeCents),
            milestone_amount_cents: String(fees.grossAmountCents),
         }
      },
      metadata: {
        milestone_id: milestone.id,
      },
      success_url: `${baseUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/command-center/${milestone.project.id}`,
    });

    await prisma.paymentRecord.upsert({
      where: { idempotency_key: `fund_${milestone.id}` },
      update: {
        status: "PENDING",
        stripe_checkout_session_id: session.id,
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
        stripe_checkout_session_id: session.id,
        idempotency_key: `fund_${milestone.id}`,
        metadata: { fee_rate: fees.feeRate },
      },
    });

    return NextResponse.json({ url: session.url });
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
    console.error("Stripe Checkout Injection Fault:", error);
    return paymentError({
      error: "Unable to start escrow checkout.",
      code: "PAYMENT_OPERATION_FAILED",
      status: 500,
    });
  }
}
