import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2023-10-16" as any,
});

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { changeOrderId } = await req.json();
    if (!changeOrderId) {
      return NextResponse.json(
        { error: "changeOrderId is required" },
        { status: 400 }
      );
    }

    const order = await prisma.changeOrder.findUnique({
      where: { id: changeOrderId },
      include: { project: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Change Order not found" }, { status: 404 });
    }

    if (order.project.client_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized — not your project" }, { status: 403 });
    }

    if (order.status !== "PROPOSED") {
      return NextResponse.json(
        { error: "Change Order is not in a fundable state" },
        { status: 400 }
      );
    }

    const unitAmount = Math.round(Number(order.added_cost) * 100);
    if (unitAmount <= 0) {
      return NextResponse.json(
        { error: "Change Order cost must be greater than zero" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Scope Expansion: ${order.project.title}`,
              description: order.description,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          change_order_id: order.id,
          project_id: order.project_id,
        },
      },
      metadata: {
        change_order_id: order.id,
        project_id: order.project_id,
      },
      success_url: `${process.env.NEXTAUTH_URL}/command-center/${order.project_id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/command-center/${order.project_id}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[change-order-checkout] Fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
