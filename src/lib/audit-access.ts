import type { MilestoneStatus } from "@prisma/client";

export const AUDIT_ACCESS_DENIED = "Audit access denied.";
export const AUDIT_NOT_READY = "Milestone must be submitted for review before an audit can run.";
export const AUDIT_PAYLOAD_MISMATCH = "Audit payload must match the submitted milestone evidence.";

export function canAccessMilestoneAuditRequester({
  isInternal,
  userId,
  milestoneFacilitatorId,
  hasBuyerProjectAccess,
}: {
  isInternal: boolean;
  userId?: string | null;
  milestoneFacilitatorId?: string | null;
  hasBuyerProjectAccess: boolean;
}) {
  if (isInternal) return true;
  if (!userId) return false;
  return hasBuyerProjectAccess || milestoneFacilitatorId === userId;
}

export function isMilestoneAuditReady(status: MilestoneStatus) {
  return status === "SUBMITTED_FOR_REVIEW";
}

export function normalizeAuditReference(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed.replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

export function isAuditPayloadForMilestone({
  payloadUrl,
  livePreviewUrl,
  payloadStoragePath,
}: {
  payloadUrl?: string | null;
  livePreviewUrl?: string | null;
  payloadStoragePath?: string | null;
}) {
  const payload = normalizeAuditReference(payloadUrl);
  if (!payload) return false;

  return [livePreviewUrl, payloadStoragePath].some((value) => normalizeAuditReference(value) === payload);
}
