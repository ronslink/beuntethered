"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import {
  assertAttachmentFile,
  getUploadFilesFromFormData,
  isUploadFileEntry,
  uploadAttachmentFile,
  uploadPayloadBuffer,
} from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { milestoneSubmissionInputSchema } from "@/lib/validators";
import { canSubmitMilestone } from "@/lib/milestone-state";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { notifyTrustEvent } from "@/lib/trust-notifications";

const MAX_DELIVERY_ARCHIVE_BYTES = 25 * 1024 * 1024;

/**
 * Epic: Facilitator Milestone Submission
 * Validates payload, uploads it securely, and moves Milestone to PENDING_REVIEW (in our schema SUBMITTED_FOR_REVIEW)
 */
export async function submitMilestonePayload(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") {
      return { success: false, error: "Unauthorized" };
    }

    await assertDurableRateLimit({
      key: rateLimitKey("milestone.submit", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = milestoneSubmissionInputSchema.safeParse({
      milestoneId: formData.get("milestoneId"),
      previewUrl: formData.get("previewUrl"),
      evidenceSummary: formData.get("evidenceSummary"),
      linkedEvidenceSourceIds: formData.getAll("linkedEvidenceSourceIds"),
    });
    const fileEntry = formData.get("payloadZip");
    const evidenceFiles = getUploadFilesFromFormData(formData, "evidenceFiles");
    const proofAttested = formData.get("proofAttestation") === "on" || formData.get("proofAttestation") === "true";

    if (!parsed.success || !isUploadFileEntry(fileEntry)) {
      return { success: false, error: "Enter a valid preview URL, evidence summary, and delivery archive." };
    }
    if (!proofAttested) {
      return { success: false, error: "Confirm the submission maps to the proof gates and acceptance checks before submitting." };
    }

    const { milestoneId, previewUrl, evidenceSummary, linkedEvidenceSourceIds } = parsed.data;
    const file = fileEntry;
    if (!file.name.endsWith(".zip") && !file.name.endsWith(".tar.gz")) {
      return { success: false, error: "Payload must be a .zip or .tar.gz archive" };
    }

    assertAttachmentFile(file, { maxBytes: MAX_DELIVERY_ARCHIVE_BYTES });

    // 0. Verify milestone ownership and escrow state before accepting a delivery package.
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: { select: { title: true, client_id: true } } },
    });

    if (!milestone || milestone.facilitator_id !== user.id) {
      throw new Error("You are not authorized to submit this milestone.");
    }

    if (!canSubmitMilestone(milestone.status)) {
      return {
        success: false,
        error: "This milestone must be funded in escrow before delivery can be submitted.",
      };
    }

    const linkedEvidenceSources = linkedEvidenceSourceIds.length > 0
      ? await prisma.projectEvidenceSource.findMany({
          where: {
            id: { in: linkedEvidenceSourceIds },
            project_id: milestone.project_id,
          },
          select: {
            id: true,
            type: true,
            label: true,
            url: true,
            status: true,
          },
        })
      : [];

    if (linkedEvidenceSources.length !== linkedEvidenceSourceIds.length) {
      return {
        success: false,
        error: "One or more selected evidence sources are no longer available on this project. Refresh and try again.",
      };
    }

    // 1. Convert File to buffer for server-based storage upload
    // Note: In production with >4.5MB files, the presigned URL client-upload route must be used.
    // For MVP Beta, we accept ArrayBuffer direct.
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 2. Upload Payload securely
    const storagePath = await uploadPayloadBuffer(file.name, buffer, milestoneId);
    const uploadedEvidence = [];
    for (const evidenceFile of evidenceFiles) {
      uploadedEvidence.push(
        await uploadAttachmentFile({
          file: evidenceFile,
          projectId: milestone.project_id,
          uploaderId: user.id,
          purpose: "MILESTONE_SUBMISSION",
          entityId: milestone.id,
        })
      );
    }

    // 3. Mutate state with a precondition so duplicate tabs or stale clients cannot resubmit.
    const submitted = await prisma.milestone.updateMany({
      where: { id: milestoneId, facilitator_id: user.id, status: "FUNDED_IN_ESCROW" },
      data: {
        live_preview_url: previewUrl,
        payload_storage_path: storagePath,
        status: "SUBMITTED_FOR_REVIEW"
      }
    });

    if (submitted.count === 0) {
      return {
        success: false,
        error: "Milestone state changed before submission completed. Refresh and review the latest status.",
      };
    }

    await prisma.attachment.create({
      data: {
        uploader_id: user.id,
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        name: file.name,
        url: storagePath,
        content_type: file.type || null,
        size_bytes: file.size || null,
        purpose: "MILESTONE_SUBMISSION",
      },
    });

    if (uploadedEvidence.length > 0) {
      await prisma.attachment.createMany({
        data: uploadedEvidence.map((attachment) => ({
          uploader_id: user.id,
          project_id: milestone.project_id,
          milestone_id: milestone.id,
          name: attachment.name,
          url: attachment.url,
          content_type: attachment.contentType,
          size_bytes: attachment.sizeBytes,
          purpose: "MILESTONE_SUBMISSION",
        })),
      });
    }

    await recordActivity({
      projectId: milestone.project_id,
      actorId: user.id,
      milestoneId: milestone.id,
      action: "MILESTONE_SUBMITTED",
      entityType: "Milestone",
      entityId: milestone.id,
      metadata: {
        preview_url: previewUrl,
        evidence_count: uploadedEvidence.length,
        evidence_summary: evidenceSummary,
        linked_evidence_sources: linkedEvidenceSources,
        linked_evidence_source_count: linkedEvidenceSources.length,
        proof_attested: true,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        type: "SYSTEM",
        description: `Facilitator submitted milestone evidence: ${evidenceSummary.slice(0, 240)}`,
        status: "SUCCESS",
        author: user.name || "Facilitator",
      },
    });

    await notifyTrustEvent({
      userId: milestone.project.client_id,
      kind: "MILESTONE_SUBMITTED",
      projectId: milestone.project_id,
      projectTitle: milestone.project.title,
      actorRole: "FACILITATOR",
      milestoneId: milestone.id,
      metadata: {
        milestone_id: milestone.id,
        facilitator_id: user.id,
        linked_evidence_source_count: linkedEvidenceSources.length,
      },
    });

    // 4. Fire-and-forget AI payload audit — non-blocking
    // Pre-checks delivery against acceptance criteria before the Client sees Review button
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    const auditHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (internalSecret) auditHeaders["x-internal-secret"] = internalSecret;
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3200";

    fetch(`${baseUrl}/api/ai/audit-code`, {
      method: "POST",
      headers: auditHeaders,
      body: JSON.stringify({
        milestone_id: milestoneId,
        payload_url: previewUrl,
        evidence_summary: evidenceSummary,
      }),
    }).catch((err) =>
      console.error("[milestones] AI audit fire-and-forget failed:", err)
    );

    revalidatePath("/command-center");
    revalidatePath(`/command-center/${milestone.project_id}`);
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/marketplace/project/${milestone.project_id}`);
    return { success: true };
    
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds };
    }
    console.error("Submission Error:", error);
    return { success: false, error: error.message };
  }
}
