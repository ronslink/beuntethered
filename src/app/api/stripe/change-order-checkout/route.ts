import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { isPaymentConfigurationError } from "@/lib/stripe";
import { userCanManageBuyerProject } from "@/lib/project-access";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { paymentError } from "@/lib/payment-route";
import { createChangeOrderCheckoutSession } from "@/lib/change-order-checkout";
import { changeOrderCheckoutInputSchema } from "@/lib/validators";

/**
 * POST /api/stripe/change-order-checkout
 *
 * Creates a Stripe Checkout session so a Client can fund an approved Change Order.
 * The webhook picks up `checkout.session.completed` and sets the ChangeOrder to
 * ACCEPTED_AND_FUNDED once payment clears.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return paymentError({ error: "Only client accounts can approve change orders.", code: "UNAUTHORIZED", status: 401 });
    }

    const parsed = changeOrderCheckoutInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return paymentError({ error: "Change order ID is required.", code: "INVALID_PAYMENT_REQUEST", status: 400 });
    }

    const order = await prisma.changeOrder.findUnique({
      where: { id: parsed.data.changeOrderId },
      include: { project: true },
    });

    if (!order) {
      return paymentError({ error: "Change order not found.", code: "CHANGE_ORDER_NOT_FOUND", status: 404 });
    }

    const canApproveOrder = await userCanManageBuyerProject(order.project_id, user.id);
    if (!canApproveOrder) {
      return paymentError({ error: "You need buyer admin access to approve this change order.", code: "PAYMENT_ACCESS_DENIED", status: 403 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("change-order.checkout", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const checkout = await createChangeOrderCheckoutSession(order);
    if (!checkout.ok) {
      return paymentError(checkout);
    }
    if (!checkout.checkoutUrl) {
      return paymentError({
        error: "Unable to create change order checkout.",
        code: "PAYMENT_OPERATION_FAILED",
        status: 500,
      });
    }

    return NextResponse.json({ url: checkout.checkoutUrl });
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
    console.error("[change-order-checkout] Fault:", error);
    return paymentError({
      error: "Unable to create change order checkout.",
      code: "PAYMENT_OPERATION_FAILED",
      status: 500,
    });
  }
}
