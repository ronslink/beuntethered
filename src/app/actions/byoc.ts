"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";

export async function generateBYOCInvite(sowData: any) {
  try {
    const user = await getCurrentUser();
    // Enforce strict node protection natively protecting unauthenticated spam routes
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized Bypass Detection: Only Experts run BYOC nodes.");

    // Generate cryptographic array mapping directly linking the floating container natively
    const inviteToken = randomBytes(16).toString("hex");

    const project = await prisma.project.create({
      data: {
        title: sowData.title,
        ai_generated_sow: sowData.executiveSummary,
        is_byoc: true,
        status: "DRAFT",
        creator_id: user.id, // Draft intrinsically tracks back natively bypassing Null Client errors
        invite_token: inviteToken,
        milestones: {
          create: sowData.milestones.map((m: any) => ({
             title: m.title,
             amount: m.amount,
             status: "PENDING",
             facilitator_id: user.id // Fixes the fatal execution fault securely assigning array constraints explicitly during Draft phase!
          }))
        }
      }
    });

    return { success: true, inviteToken, projectId: project.id };
  } catch (error: any) {
    console.error("BYOC Generation Constraint Flaw:", error);
    return { success: false, error: error.message };
  }
}
