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

    // Fetch the newly created dispute ID for the AI analysis
    const createdDispute = await prisma.dispute.findFirst({
      where: {
        project_id: projectId,
        milestone_id: targetMilestone.id,
        client_id: user.id,
        status: "OPEN",
      },
      orderBy: { created_at: "desc" },
      select: { id: true },
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

    // Fire-and-forget AI fact-finding — non-blocking
    // Generates ai_fact_finding_report on the Dispute record for the Arbitration Panel
    if (createdDispute) {
      fetch(`${process.env.NEXTAUTH_URL}/api/ai/dispute-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.INTERNAL_API_SECRET
            ? { "x-internal-secret": process.env.INTERNAL_API_SECRET }
            : {}),
        },
        body: JSON.stringify({
          disputeId: createdDispute.id,
          reason: formattedReason,
          sowText: project.ai_generated_sow,
          milestoneTitle: targetMilestone.title,
          acceptanceCriteria: targetMilestone.acceptance_criteria ?? [],
        }),
      }).catch(async (err) => {
        console.error("[dispute] AI fact-finding fire-and-forget failed:", err);
        // Surface the failure as a FAILED TimelineEvent so the Arbitration Panel UI
        // can show a visible "AI Report Failed" flag rather than a silent blank field.
        await prisma.timelineEvent.create({
          data: {
            project_id: projectId,
            milestone_id: targetMilestone.id,
            type: "SYSTEM",
            status: "FAILED",
            description: "AI fact-finding report generation failed. Manual review required.",
            author: "system",
          },
        }).catch(() => {}); // never throw from a catch handler
      });
    }

    revalidatePath(`/command-center/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("openDispute error:", error);
    return { success: false, error: error.message || "Failed to open dispute" };
  }
}
