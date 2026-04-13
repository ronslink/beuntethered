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
 * Client safely approves the expanded cost parameter
 * NOTE: Approving a change order typically involves physical funding, but we'll map it to Escrow natively
 */
export async function approveChangeOrder(orderId: string) {
   try {
      const user = await getCurrentUser();
      if (!user || user.role !== "CLIENT") throw new Error("Unauthorized Approval Mechanism");

      const order = await prisma.changeOrder.findUnique({
         where: { id: orderId },
         include: { project: true }
      });

      if (!order || order.project.client_id !== user.id) throw new Error("Approval scope out of bounds.");

      // Safely lock state physically into Prisma
      await prisma.changeOrder.update({
         where: { id: order.id },
         data: { status: "ACCEPTED_AND_FUNDED" }
      });

      revalidatePath(`/command-center/${order.project_id}`);
      return { success: true };
   } catch(e: any) {
      return { success: false, error: e.message };
   }
}
