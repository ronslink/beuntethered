"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { createSystemNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { getUploadFilesFromFormData, uploadAttachmentFile } from "@/lib/storage";
import { disputeInputSchema } from "@/lib/validators";
import { buildDisputeEvidenceContext } from "@/lib/dispute-evidence";
import {
  canOpenDisputeRequester,
  canOpenDisputeForMilestone,
  canOpenDisputeForProject,
  DISPUTABLE_MILESTONE_STATUSES,
  DISPUTABLE_PROJECT_STATUSES,
} from "@/lib/dispute-rules";
import { userCanManageBuyerProject } from "@/lib/project-access";
import type { Prisma } from "@prisma/client";
import { sendDisputeOpenedAlert } from "@/lib/resend";
import { shouldSendEmailForPreference } from "@/lib/email-preferences";

type UploadedDisputeEvidence = Awaited<ReturnType<typeof uploadAttachmentFile>>;

type OpenDisputeParams = {
  projectId: string;
  milestoneId?: string;
  reason: string;
  codeDoesNotRun: boolean;
  appmapLogContent?: string;
  appmapFile?: File | null;
  evidenceFiles?: File[];
};

async function createDispute(params: OpenDisputeParams): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "CLIENT" && user.role !== "FACILITATOR")) {
      return { success: false, error: "Unauthorized" };
    }

    await assertDurableRateLimit({
      key: rateLimitKey("dispute.open", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = disputeInputSchema.safeParse(params);
    if (!parsed.success) {
      return { success: false, error: "Describe the dispute in at least 10 characters." };
    }

    const { projectId, milestoneId, reason, codeDoesNotRun } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            email: true,
            notify_payment_updates: true,
            notify_new_proposals: true,
            notify_milestone_reviews: true,
          },
        },
        milestones: {
          orderBy: { id: "asc" },
          include: {
            facilitator: {
              select: {
                email: true,
                notify_payment_updates: true,
                notify_new_proposals: true,
                notify_milestone_reviews: true,
              },
            },
            audits: { orderBy: { created_at: "desc" }, take: 1, include: { attachments: true } },
            attachments: { orderBy: { created_at: "desc" } },
            payment_records: { orderBy: { created_at: "desc" } },
            activity_logs: { orderBy: { created_at: "desc" }, take: 8 },
          },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    if (!canOpenDisputeForProject(project.status)) {
      return { success: false, error: "Project cannot be disputed" };
    }

    const targetMilestone =
      (milestoneId ? project.milestones.find((m) => m.id === milestoneId) : null) ||
      project.milestones.find((m) => m.status !== "APPROVED_AND_PAID") ||
      project.milestones[0];

    if (!targetMilestone) {
      return { success: false, error: "No milestone available for dispute" };
    }

    if (milestoneId && targetMilestone.id !== milestoneId) {
      return { success: false, error: "Milestone not found on this project" };
    }

    const isBuyerManager = user.role === "CLIENT" && await userCanManageBuyerProject(projectId, user.id);
    const isAssignedFacilitator = user.role === "FACILITATOR" && targetMilestone.facilitator_id === user.id;

    if (!canOpenDisputeRequester({ isBuyerManager, isAssignedFacilitator })) {
      return { success: false, error: "Unauthorized" };
    }

    if (!project.client_id) {
      return { success: false, error: "Project has no client account to notify for dispute review." };
    }
    const clientId = project.client_id;

    if (!canOpenDisputeForMilestone(targetMilestone.status)) {
      return { success: false, error: "This milestone cannot be disputed from its current state." };
    }

    if (!targetMilestone.facilitator_id) {
      return { success: false, error: "Milestone has no assigned facilitator" };
    }
    const facilitatorId = targetMilestone.facilitator_id;

    const disputeContext = buildDisputeEvidenceContext(targetMilestone);

    const formattedReason = codeDoesNotRun
      ? `[CODE DOES NOT RUN] ${reason}`
      : reason;
    const openedByRole = isAssignedFacilitator ? "FACILITATOR" : "CLIENT";

    const uploadedEvidence: UploadedDisputeEvidence[] = [];
    let appmapLogUrl = params.appmapLogContent ?? null;

    if (params.appmapFile) {
      const uploadedAppmap = await uploadAttachmentFile({
        file: params.appmapFile,
        projectId,
        uploaderId: user.id,
        purpose: "DISPUTE_EVIDENCE",
        entityId: targetMilestone.id,
      });
      uploadedEvidence.push(uploadedAppmap);
      appmapLogUrl = uploadedAppmap.url;
    }

    for (const evidenceFile of params.evidenceFiles ?? []) {
      uploadedEvidence.push(
        await uploadAttachmentFile({
          file: evidenceFile,
          projectId,
          uploaderId: user.id,
          purpose: "DISPUTE_EVIDENCE",
          entityId: targetMilestone.id,
        })
      );
    }

    const createdDispute = await prisma.$transaction(async (tx) => {
      const projectClaimed = await tx.project.updateMany({
        where: { id: projectId, status: { in: DISPUTABLE_PROJECT_STATUSES } },
        data: { status: "DISPUTED" },
      });
      if (projectClaimed.count === 0) {
        throw new Error("Project cannot be disputed");
      }

      const milestoneClaimed = await tx.milestone.updateMany({
        where: { id: targetMilestone.id, status: { in: DISPUTABLE_MILESTONE_STATUSES } },
        data: { status: "DISPUTED" },
      });
      if (milestoneClaimed.count === 0) {
        throw new Error("This milestone cannot be disputed from its current state.");
      }

      const dispute = await tx.dispute.create({
        data: {
          project_id: projectId,
          milestone_id: targetMilestone.id,
          client_id: clientId,
          facilitator_id: facilitatorId,
          reason: formattedReason,
          appmap_log_url: appmapLogUrl ?? undefined,
          status: "OPEN",
        },
        select: { id: true },
      });

      if (uploadedEvidence.length > 0) {
        await tx.attachment.createMany({
          data: uploadedEvidence.map((attachment) => ({
            uploader_id: user.id,
            project_id: projectId,
            milestone_id: targetMilestone.id,
            dispute_id: dispute.id,
            name: attachment.name,
            url: attachment.url,
            content_type: attachment.contentType,
            size_bytes: attachment.sizeBytes,
            purpose: "DISPUTE_EVIDENCE",
          })),
        });
      }

      return dispute;
    });

    const counterpartyId = openedByRole === "CLIENT" ? facilitatorId : clientId;
    const counterpartyEmail = openedByRole === "CLIENT"
      ? targetMilestone.facilitator?.email
      : project.client?.email;
    const counterpartyPrefs = openedByRole === "CLIENT"
      ? targetMilestone.facilitator
      : project.client;
    await createSystemNotification({
      userId: counterpartyId,
      message:
        openedByRole === "CLIENT"
          ? `A client dispute has been opened on "${project.title}". Reason: ${reason.slice(0, 80)}${reason.length > 80 ? "..." : ""}`
          : `A facilitator dispute has been opened on "${project.title}". Reason: ${reason.slice(0, 80)}${reason.length > 80 ? "..." : ""}`,
      type: "ERROR",
      href: `/command-center/${projectId}`,
      sourceKey: `dispute_opened_${createdDispute.id}_${counterpartyId}`,
      metadata: {
        dispute_id: createdDispute.id,
        opened_by_role: openedByRole,
        milestone_id: targetMilestone.id,
      },
    });

    if (counterpartyEmail && shouldSendEmailForPreference("ESSENTIAL_WORKFLOW", counterpartyPrefs)) {
      await sendDisputeOpenedAlert({
        counterpartyEmail,
        projectId,
        projectTitle: project.title,
        milestoneTitle: targetMilestone.title,
        openedByRole,
        reason,
      });
    }

    await recordActivity({
      projectId,
      actorId: user.id,
      milestoneId: targetMilestone.id,
      action: "DISPUTE_OPENED",
      entityType: "Dispute",
      entityId: createdDispute.id,
      metadata: {
        code_does_not_run: codeDoesNotRun,
        opened_by_role: openedByRole,
        evidence_count: uploadedEvidence.length,
        milestone_title: disputeContext.milestoneTitle,
        milestone_status: disputeContext.milestoneStatus,
        proof_summary: disputeContext.proofPlan.summary,
        required_artifacts: disputeContext.proofPlan.requiredArtifacts.map((artifact) => ({
          key: artifact.key,
          label: artifact.label,
          available: artifact.available,
        })),
        latest_audit_score: disputeContext.latestAudit?.score ?? null,
        latest_audit_passing: disputeContext.latestAudit?.isPassing ?? null,
        submitted_evidence_count: disputeContext.submittedEvidence.length,
      } satisfies Prisma.InputJsonValue,
    });

    // Fire-and-forget AI fact-finding — non-blocking
    // Generates ai_fact_finding_report on the Dispute record for the Arbitration Panel
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3200";

    fetch(`${baseUrl}/api/ai/dispute-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalSecret ? { "x-internal-secret": internalSecret } : {}),
      },
      body: JSON.stringify({
        disputeId: createdDispute.id,
        reason: formattedReason,
        sowText: project.ai_generated_sow,
        milestoneTitle: targetMilestone.title,
        acceptanceCriteria: targetMilestone.acceptance_criteria ?? [],
        evidenceUrls: uploadedEvidence.map((attachment) => attachment.url),
        disputeEvidence: uploadedEvidence.map((attachment) => ({
          name: attachment.name,
          url: attachment.url,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
        deliveryEvidenceContext: disputeContext,
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

    revalidatePath(`/command-center/${projectId}`);
    revalidatePath("/admin/disputes");
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    console.error("openDispute error:", error);
    return { success: false, error: error.message || "Failed to open dispute" };
  }
}

export async function openDispute(params: {
  projectId: string;
  milestoneId?: string;
  reason: string;
  codeDoesNotRun: boolean;
  appmapLogContent?: string;
}): Promise<{ success: boolean; error?: string }> {
  return createDispute(params);
}

export async function openDisputeWithEvidence(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const appmapFiles = getUploadFilesFromFormData(formData, "appmapLog", { maxFiles: 1 });
    const evidenceFiles = getUploadFilesFromFormData(formData, "evidenceFiles");

    return createDispute({
      projectId: String(formData.get("projectId") ?? ""),
      milestoneId: String(formData.get("milestoneId") ?? "") || undefined,
      reason: String(formData.get("reason") ?? ""),
      codeDoesNotRun: formData.get("codeDoesNotRun") === "true",
      appmapFile: appmapFiles[0] ?? null,
      evidenceFiles,
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to upload dispute evidence" };
  }
}
