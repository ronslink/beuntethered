"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123");

/**
 * Facilitator proposes expanded scope formally mapped strictly to Escrow limits
 */
export async function proposeChangeOrder(projectId: string, description: string, addedCost: number) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized");

    // Enforce physical bounds logic mapping 
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project || project.status !== "ACTIVE") throw new Error("Project not eligible for Change Orders.");

    // Validate facilitator owns at least one milestone explicitly
    const isOwner = project.milestones.some(m => m.facilitator_id === user.id);
    if (!isOwner) throw new Error("You are not cleared to modify this scope natively.");

    const order = await prisma.changeOrder.create({
       data: {
          project_id: projectId,
          description: description,
          added_cost: addedCost,
          status: "PROPOSED"
       }
    });

    revalidatePath(`/command-center/${projectId}`);
    return { success: true, orderId: order.id };

  } catch (error: any) {
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
      throw new Error("Unauthorized Approval Mechanism");

    const order = await prisma.changeOrder.findUnique({
      where: { id: orderId },
      include: { project: true },
    });

    if (!order || order.project.client_id !== user.id)
      throw new Error("Approval scope out of bounds.");

    if (order.status !== "PROPOSED")
      throw new Error("Change Order is not pending approval.");

    // Delegate payment to the dedicated Stripe endpoint
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/stripe/change-order-checkout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeOrderId: orderId }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || "Failed to create Stripe Checkout session.");
    }

    return { success: true, checkoutUrl: data.url };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
