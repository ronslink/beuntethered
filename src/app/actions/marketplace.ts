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
      },
      include: {
        milestones: true
      }
    });

    // Check if the wizard was successfully executed via the AI Concierge Vector mapping logic
    if (sowData.mode === "CONCIERGE" && Array.isArray(sowData.selected_facilitators) && sowData.selected_facilitators.length > 0) {
       // Bind identical chronological mapping array connecting the newly minted milestones to the user ID array
       const membersData = sowData.selected_facilitators.map((fac: any, index: number) => {
          const matchedMilestone = project.milestones[index];
          if (!matchedMilestone) return null;
          return {
             milestone_id: matchedMilestone.id,
             facilitator_id: fac.id
          };
       }).filter(Boolean);

       if (membersData.length > 0) {
          await prisma.squadProposal.create({
             data: {
                project_id: project.id,
                pitch_to_client: "This architectural combination of verified developers was directly assembled by our AI Concierge Matcher based on explicit vector metric overlap against the Scope of Work constraints. This represents the optimal execution squad.",
                status: "PENDING",
                members: {
                   create: membersData
                }
             }
          });
       }
    }

    revalidatePath("/marketplace");
    revalidatePath("/dashboard");

    return { success: true, projectId: project.id };

  } catch (error: any) {
    console.error("Critical Server Action Fault:", error);
    return { success: false, error: error.message };
  }
}
