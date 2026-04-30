import type { VerificationStatus, VerificationType } from "@prisma/client";

export const MANUAL_VERIFICATION_TYPES: VerificationType[] = ["PORTFOLIO", "BUSINESS"];

export function canManuallyReviewVerificationType(type: VerificationType) {
  return MANUAL_VERIFICATION_TYPES.includes(type);
}

export function normalizeManualVerificationNote(note?: string | null) {
  const normalized = note?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.slice(0, 500);
}

export function buildManualVerificationEvidence({
  existingEvidence,
  reviewerId,
  status,
  note,
}: {
  existingEvidence: unknown;
  reviewerId: string;
  status: VerificationStatus;
  note?: string | null;
}) {
  return {
    profile_evidence: existingEvidence ?? null,
    manual_review: {
      reviewer_id: reviewerId,
      status,
      note: normalizeManualVerificationNote(note) || null,
      reviewed_at: new Date().toISOString(),
    },
  };
}
