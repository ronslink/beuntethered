"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function cancelOpenListing(projectId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.client_id !== user.id) throw new Error("Project not found or unauthorized");
    if (project.status !== "OPEN_BIDDING") {
       throw new Error("Project is no longer in OPEN_BIDDING and cannot be safely cancelled. Contact arbitration if Escrow is locked.");
    }

    // Safely update bounds and sever marketplace exposure
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "CANCELLED" }
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/marketplace");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to cancel listing:", error);
    return { success: false, error: error.message };
  }
}

export async function editProjectSow(projectId: string, newSow: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized");

    if (!newSow || newSow.trim() === "") {
        throw new Error("SOW String cannot be empty.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { bids: true }
    });

    if (!project || project.client_id !== user.id) throw new Error("Project not found or unauthorized");
    if (project.status !== "OPEN_BIDDING") {
       throw new Error("Cannot modify SOW context of a project that is already active/locked.");
    }

    // If SOW changes, we must safely delete all stale bids and squad proposals to prevent mapping issues 
    // where a dev bid on a completely different set of instructions!
    await prisma.$transaction([
       prisma.bid.deleteMany({ where: { project_id: projectId } }),
       prisma.squadProposal.deleteMany({ where: { project_id: projectId } }), // Cascades down into members natively via constraints
       prisma.project.update({
         where: { id: projectId },
         data: { ai_generated_sow: newSow.trim() }
       })
    ]);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/marketplace");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to edit scope:", error);
    return { success: false, error: error.message };
  }
}
