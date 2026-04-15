"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { uploadPayloadBuffer } from "@/lib/storage";
import { revalidatePath } from "next/cache";

/**
 * Epic: Facilitator Milestone Submission
 * Validates payload, uploads it securely, and moves Milestone to PENDING_REVIEW (in our schema SUBMITTED_FOR_REVIEW)
 */
export async function submitMilestonePayload(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, error: "Unauthorized" };
  }

  const milestoneId = formData.get("milestoneId") as string;
  const previewUrl = formData.get("previewUrl") as string;
  const file = formData.get("payloadZip") as File;

  if (!milestoneId || !previewUrl || !file) {
    return { success: false, error: "Missing required fields" };
  }

  if (!file.name.endsWith(".zip") && !file.name.endsWith(".tar.gz")) {
    return { success: false, error: "Payload must be a .zip or .tar.gz archive" };
  }

  try {
    // 0. IDOR Mitigation: Verify Escrow Ownership
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId }
    });

    if (!milestone || milestone.facilitator_id !== user.id) {
       throw new Error("Critical IDOR constraints: Active facilitator is not authorized to deploy payloads against this exact structural node.");
    }

    // 1. Convert File to buffer for server-based storage upload
    // Note: In production with >4.5MB files, the presigned URL client-upload route must be used.
    // For MVP Beta, we accept ArrayBuffer direct.
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 2. Upload Payload securely
    const storagePath = await uploadPayloadBuffer(file.name, buffer, milestoneId);

    // 3. Mutate State
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        live_preview_url: previewUrl,
        payload_storage_path: storagePath,
        status: "SUBMITTED_FOR_REVIEW"
      }
    });

    // 4. Fire-and-forget AI payload audit — non-blocking
    // Pre-checks delivery against acceptance criteria before the Client sees Review button
    fetch(`${process.env.NEXTAUTH_URL}/api/ai/audit-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_id: milestoneId,
        payload_url: previewUrl,
      }),
    }).catch((err) =>
      console.error("[milestones] AI audit fire-and-forget failed:", err)
    );

    revalidatePath(`/command-center`);
    return { success: true };
    
  } catch (error: any) {
    console.error("Submission Error:", error);
    return { success: false, error: error.message };
  }
}
