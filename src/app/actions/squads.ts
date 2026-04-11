"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { openai } from "@ai-sdk/openai";
import { generateObject, embed } from "ai";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDynamicAIProvider } from "@/lib/ai-router";


export async function assembleSquad(projectId: string) {
  try {
    const user = await getCurrentUser();
    // Only active platform delegates trigger algorithmic mapping
    if (!user) throw new Error("Unauthorized loop sequence.");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project) throw new Error("Target cluster unresolvable.");

    const totalBudget = project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
    const candidatePools: Record<string, any> = {};

    for (const milestone of project.milestones) {
       // Step A: Vector Retrieval using pgvector natively 
       const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: milestone.title,
       });

       const vectorLiteral = `[${embedding.join(',')}]`;
       
       // Query isolating FACILITATORS exclusively evaluating cosine distance safely via Prisma queryRaw
       const topCandidates = await prisma.$queryRaw`
          SELECT id, name, email 
          FROM "User" 
          WHERE role = 'FACILITATOR' 
          ORDER BY expertise_embedding <=> ${vectorLiteral}::vector 
          LIMIT 3;
       `;

       candidatePools[milestone.id] = {
         milestoneTitle: milestone.title,
         candidates: topCandidates
       };
    }

    const dynamicModel = await getDynamicAIProvider(user.id);

    // Step B & C: Synthesis bridging constraints into the Vercel AI prompt explicitly capping the limit 
    const { object } = await generateObject({
      model: dynamicModel,
      system: "You are an AI Project Manager. Review the milestones and the provided pool of Facilitators. Select exactly ONE Facilitator for each milestone to form a 'Squad'. Your primary constraint is that the sum of their individual costs MUST NOT exceed the client's total budget. Output a JSON object containing the squad_members and a pitch_to_client explaining why this specific team is perfect.",
      prompt: `Project: ${project.title}\nTotal Escrow Allocated: $${totalBudget}\n\nCandidate Arrays grouped identically by Milestone ID:\n${JSON.stringify(candidatePools, null, 2)}`,
      schema: z.object({
         pitch_to_client: z.string().describe("Executive pitch summarizing precisely why these experts form an elite engineering network logic mapping."),
         squad_members: z.array(z.object({
            milestone_id: z.string(),
            facilitator_id: z.string().describe("Selected array User ID representing the assigned Facilitator.")
         }))
      })
    });

    // Save directly mapping DB tables executing relations deeply
    const squadProposal = await prisma.squadProposal.create({
      data: {
        project_id: project.id,
        pitch_to_client: object.pitch_to_client,
        status: "PENDING",
        members: {
          create: object.squad_members.map((m: any) => ({
             milestone_id: m.milestone_id,
             facilitator_id: m.facilitator_id
          }))
        }
      }
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, squadProposalId: squadProposal.id };
    
  } catch (error: any) {
    console.error("Assemble Squad Logic Boundary Fault:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptSquadProposal(squadProposalId: string) {
   try {
      const user = await getCurrentUser();
      if (!user || user.role !== "CLIENT") throw new Error("Unauthorized access mapped to non-client context natively.");

      const proposal = await prisma.squadProposal.findUnique({
         where: { id: squadProposalId },
         include: { members: true, project: true }
      });
      if (!proposal || proposal.project.client_id !== user.id) throw new Error("Invalid constraints locking execution bindings.");

      await prisma.$transaction(async (tx) => {
         await tx.squadProposal.update({
            where: { id: squadProposalId },
            data: { status: "ACCEPTED" }
         });

         await tx.project.update({
            where: { id: proposal.project_id },
            data: { status: "ACTIVE" }
         });

         for (const member of proposal.members) {
            await tx.milestone.update({
               where: { id: member.milestone_id },
               data: { facilitator_id: member.facilitator_id }
            });
         }
      });

      revalidatePath(`/projects/${proposal.project_id}`);
      return { success: true };
   } catch(err: any) {
      console.error("Critical Squad Map Fault:", err);
      return { success: false, error: err.message };
   }
}
