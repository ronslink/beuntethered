"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { sendSystemNotification } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";

export async function openDispute(params: {
  projectId: string;
  reason: string;
  codeDoesNotRun: boolean;
  appmapLogContent?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return { success: false, error: "Unauthorized" };
    }

    const { projectId, reason, codeDoesNotRun, appmapLogContent } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (project.status === "COMPLETED" || project.status === "DISPUTED") {
      return { success: false, error: "Project cannot be disputed" };
    }

    if (project.client_id !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const targetMilestone =
      project.milestones.find((m) => m.status !== "APPROVED_AND_PAID") ||
      project.milestones[0];

    if (!targetMilestone) {
      return { success: false, error: "No milestone available for dispute" };
    }

    if (!targetMilestone.facilitator_id) {
      return { success: false, error: "Milestone has no assigned facilitator" };
    }

    const formattedReason = codeDoesNotRun
      ? `[CODE DOES NOT RUN] ${reason}`
      : reason;

    await prisma.dispute.create({
      data: {
        project_id: projectId,
        milestone_id: targetMilestone.id,
        client_id: user.id,
        facilitator_id: targetMilestone.facilitator_id,
        reason: formattedReason,
        appmap_log_url: appmapLogContent ?? null,
        status: "OPEN",
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "DISPUTED" },
    });

    await prisma.milestone.update({
      where: { id: targetMilestone.id },
      data: { status: "DISPUTED" },
    });

    if (targetMilestone.facilitator_id) {
      await sendSystemNotification(
        targetMilestone.facilitator_id,
        `A dispute has been opened on "${project.title}". Reason: ${reason.slice(0, 80)}${reason.length > 80 ? "..." : ""}`,
        "ERROR"
      );
    }

    revalidatePath(`/command-center/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("openDispute error:", error);
    return { success: false, error: error.message || "Failed to open dispute" };
  }
}
