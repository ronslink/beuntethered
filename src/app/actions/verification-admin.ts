"use server";

import type { VerificationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { upsertUserVerification } from "@/lib/facilitator-verification";
import {
  buildManualVerificationEvidence,
  canManuallyReviewVerificationType,
  normalizeManualVerificationNote,
} from "@/lib/manual-verification-review";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function reviewManualVerification(input: {
  verificationId: string;
  status: Extract<VerificationStatus, "VERIFIED" | "REJECTED">;
  note?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    return { success: false, code: "UNAUTHORIZED", error: "Only platform admins can review verification evidence." };
  }

  const status = input.status;
  if (status !== "VERIFIED" && status !== "REJECTED") {
    return { success: false, code: "INVALID_STATUS", error: "Choose approve or reject before saving review." };
  }

  const verification = await prisma.verification.findUnique({
    where: { id: input.verificationId },
    select: {
      id: true,
      user_id: true,
      type: true,
      evidence: true,
      user: { select: { role: true } },
    },
  });

  if (!verification || !canManuallyReviewVerificationType(verification.type)) {
    return { success: false, code: "NOT_REVIEWABLE", error: "Only portfolio and business verification can be manually reviewed." };
  }

  if (verification.type === "PORTFOLIO" && verification.user.role !== "FACILITATOR") {
    return { success: false, code: "INVALID_OWNER", error: "Portfolio verification is only valid for facilitators." };
  }

  if (verification.type === "BUSINESS" && verification.user.role !== "CLIENT") {
    return { success: false, code: "INVALID_OWNER", error: "Business verification is only valid for client accounts." };
  }

  const reviewed = await upsertUserVerification({
    userId: verification.user_id,
    type: verification.type,
    status,
    provider: "manual_admin_review",
    evidence: buildManualVerificationEvidence({
      existingEvidence: verification.evidence,
      reviewerId: user.id,
      status,
      note: normalizeManualVerificationNote(input.note),
    }),
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/settings");
  revalidatePath("/talent");

  return { success: true, verificationId: reviewed.id };
}
