import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { reconcileMilestoneFunding } from "@/lib/payment-reconciliation";
import { createStripeClient, getAppBaseUrl, isPaymentConfigurationError } from "@/lib/stripe";
import { getCheckoutPaymentIntentId } from "@/lib/stripe-webhook";
import { userCanManageBuyerProject } from "@/lib/project-access";

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getAppBaseUrl();
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return NextResponse.redirect(`${baseUrl}/dashboard`);

    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const milestoneId = session.metadata?.milestone_id;
    const paymentIntentId = getCheckoutPaymentIntentId(session);

    if (!milestoneId) return NextResponse.redirect(`${baseUrl}/dashboard`);

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true, facilitator: { select: { id: true } } },
    });

    const canManageProjectPayment = milestone
      ? await userCanManageBuyerProject(milestone.project_id, user.id)
      : false;

    if (!milestone || !canManageProjectPayment) {
      return NextResponse.redirect(`${baseUrl}/dashboard`);
    }

    if (session.payment_status === "paid" && paymentIntentId) {
      await reconcileMilestoneFunding({
        milestoneId,
        paymentIntentId,
        checkoutSessionId: session.id,
        actorId: user.id,
        source: "checkout_success",
      });
    }

    return NextResponse.redirect(`${baseUrl}/command-center/${milestone.project_id}`);
  } catch (error: any) {
    if (isPaymentConfigurationError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    console.error("[Stripe Checkout Success] Fault:", error);
    return NextResponse.json({ error: "Unable to reconcile checkout session." }, { status: 500 });
  }
}
