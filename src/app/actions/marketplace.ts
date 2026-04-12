"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function postProjectToMarketplace(sowData: any) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized to post projects to Marketplace.");

    // Transmute AI JSON heavily into Prisma Escrow objects flawlessly
    const project = await prisma.project.create({
      data: {
        title: sowData.title,
        ai_generated_sow: sowData.executiveSummary,
        is_byoc: false, // Automatically pushes to Marketplace constraints
        status: "OPEN_BIDDING",
        creator_id: user.id,
        client_id: user.id, // Posting client anchors the project permanently
        milestones: {
          create: sowData.milestones.map((m: any) => ({
            title: m.title,
            description: m.description || null,
            acceptance_criteria: m.acceptance_criteria 
              ? (Array.isArray(m.acceptance_criteria) ? m.acceptance_criteria : [m.acceptance_criteria])
              : [],
            deliverables: m.deliverables && Array.isArray(m.deliverables) 
              ? m.deliverables.filter((d: string) => d.trim().length > 0)
              : [],
            estimated_duration_days: m.estimated_duration_days || null,
            amount: m.amount,
            status: "PENDING"
          }))
        }
      }
    });

    revalidatePath("/marketplace");
    revalidatePath("/dashboard");

    return { success: true, projectId: project.id };

  } catch (error: any) {
    console.error("Critical Server Action Fault:", error);
    return { success: false, error: error.message };
  }
}
