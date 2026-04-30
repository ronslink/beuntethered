export type AuditReleaseStatus = "PENDING" | "SUCCESS" | "FAILED" | "NONE";

export type ReviewReleaseChecklist = {
  testedPreview: boolean;
  reviewedEvidence: boolean;
  acceptsRelease: boolean;
  auditStatus: AuditReleaseStatus;
  failedAuditOverrideAccepted?: boolean;
  failedAuditOverrideReason?: string | null;
};

export function getAuditReleaseStatusFromLatestAudit(
  latestAudit: { is_passing: boolean } | null | undefined
): AuditReleaseStatus {
  if (!latestAudit) return "PENDING";
  return latestAudit.is_passing ? "SUCCESS" : "FAILED";
}

export function getReviewReleaseState(checklist: ReviewReleaseChecklist) {
  const checklistComplete =
    checklist.testedPreview &&
    checklist.reviewedEvidence &&
    checklist.acceptsRelease;
  const auditPending = checklist.auditStatus === "PENDING";
  const failedAuditOverrideRequired = checklist.auditStatus === "FAILED";
  const failedAuditOverrideComplete =
    !failedAuditOverrideRequired ||
    (checklist.failedAuditOverrideAccepted === true &&
      Boolean(checklist.failedAuditOverrideReason?.trim()));
  const canRelease = checklistComplete && !auditPending && failedAuditOverrideComplete;

  if (auditPending) {
    return {
      canRelease,
      label: "Audit Pending",
      reason: "Wait for the delivery audit result before releasing escrow.",
    };
  }

  if (!checklistComplete) {
    return {
      canRelease,
      label: "Complete Review",
      reason: "Complete the buyer review checklist before releasing escrow.",
    };
  }

  if (!failedAuditOverrideComplete) {
    return {
      canRelease,
      label: "Override Required",
      reason: "Explain why you accept this delivery despite the failed audit before releasing escrow.",
    };
  }

  return {
    canRelease,
    label: "Approve & Pay",
    reason: null,
  };
}
