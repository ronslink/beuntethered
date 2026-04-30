import type { ChangeOrder, Project } from "@prisma/client";
import { createStripeClient, getAppBaseUrl } from "@/lib/stripe";
import {
  buildChangeOrderCheckoutMetadata,
  validateChangeOrderFundingReadiness,
} from "./change-order-rules.ts";

export async function createChangeOrderCheckoutSession(
  order: ChangeOrder & { project: Project }
) {
  const readiness = validateChangeOrderFundingReadiness(order);
  if (!readiness.ok) return readiness;

  const stripe = createStripeClient();
  const baseUrl = getAppBaseUrl();
  const metadata = buildChangeOrderCheckoutMetadata({
    changeOrderId: order.id,
    projectId: order.project_id,
    addedCostCents: readiness.addedCostCents,
  });

  const session = await stripe.checkout.sessions.create(
    {
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
            unit_amount: readiness.addedCostCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata },
      metadata,
      success_url: `${baseUrl}/command-center/${order.project_id}?tab=delivery`,
      cancel_url: `${baseUrl}/command-center/${order.project_id}?tab=delivery`,
    },
    { idempotencyKey: `change_order_checkout_${order.id}` }
  );

  return {
    ok: true as const,
    checkoutUrl: session.url,
    checkoutSessionId: session.id,
    addedCostCents: readiness.addedCostCents,
  };
}
