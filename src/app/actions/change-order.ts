"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { userCanManageBuyerProject } from "@/lib/project-access";
import { createChangeOrderCheckoutSession } from "@/lib/change-order-checkout";
import { changeOrderCheckoutInputSchema, changeOrderProposalInputSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

/**
 * Facilitator proposes expanded scope for client approval.
 */
export async function proposeChangeOrder(projectId: string, description: string, addedCost: number) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized");

    await assertDurableRateLimit({
      key: rateLimitKey("change-order.propose", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = changeOrderProposalInputSchema.safeParse({ projectId, description, addedCost });
    if (!parsed.success) {
      return { success: false, code: "INVALID_CHANGE_ORDER", error: "Describe the added scope and enter a valid cost." };
    }
    const input = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: { milestones: true }
    });

    if (!project || project.status !== "ACTIVE") throw new Error("Project not eligible for Change Orders.");

    // Validate facilitator owns at least one milestone explicitly
    const isOwner = project.milestones.some(m => m.facilitator_id === user.id);
    if (!isOwner) throw new Error("You are not authorized to modify this scope.");

    const order = await prisma.changeOrder.create({
       data: {
          project_id: input.projectId,
          description: input.description,
          added_cost: input.addedCost,
          status: "PROPOSED"
       }
    });

    await recordActivity({
      projectId: input.projectId,
      actorId: user.id,
      action: "SYSTEM_EVENT",
      entityType: "ChangeOrder",
      entityId: order.id,
      metadata: {
        operation: "CHANGE_ORDER_PROPOSED",
        added_cost_cents: Math.round(input.addedCost * 100),
      } satisfies Prisma.InputJsonValue,
    });

    revalidatePath(`/command-center/${input.projectId}`);
    return { success: true, orderId: order.id };

  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Client approves the expanded cost parameter.
 * Returns a Stripe Checkout URL — the DB status moves to ACCEPTED_AND_FUNDED
 * only after the Stripe webhook confirms payment (checkout.session.completed).
 */
export async function approveChangeOrder(
  orderId: string
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT")
      throw new Error("Unauthorized");

    const parsed = changeOrderCheckoutInputSchema.safeParse({ changeOrderId: orderId });
    if (!parsed.success) {
      return { success: false, error: "Change order ID is required." };
    }

    const order = await prisma.changeOrder.findUnique({
      where: { id: parsed.data.changeOrderId },
      include: { project: true },
    });

    const canApproveOrder = order
      ? await userCanManageBuyerProject(order.project_id, user.id)
      : false;

    if (!order || !canApproveOrder)
      throw new Error("You are not authorized to approve this change order.");

    if (order.status !== "PROPOSED")
      throw new Error("Change Order is not pending approval.");

    await assertDurableRateLimit({
      key: rateLimitKey("change-order.approve", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const checkout = await createChangeOrderCheckoutSession(order);
    if (!checkout.ok || !checkout.checkoutUrl) {
      throw new Error(checkout.ok ? "Failed to create Stripe Checkout session." : checkout.error);
    }

    return { success: true, checkoutUrl: checkout.checkoutUrl };
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return { success: false, error: e.message };
    }
    return { success: false, error: e.message };
  }
}
