import type { MilestoneStatus } from "@prisma/client";

export const FUNDABLE_MILESTONE_STATUSES: MilestoneStatus[] = ["PENDING"];

export const RELEASABLE_MILESTONE_STATUSES: MilestoneStatus[] = ["SUBMITTED_FOR_REVIEW"];

export const SUBMITTABLE_MILESTONE_STATUSES: MilestoneStatus[] = ["FUNDED_IN_ESCROW"];

export const REFUNDABLE_MILESTONE_STATUSES: MilestoneStatus[] = ["DISPUTED"];

export function canFundMilestone(status: MilestoneStatus) {
  return FUNDABLE_MILESTONE_STATUSES.includes(status);
}

export function canSubmitMilestone(status: MilestoneStatus) {
  return SUBMITTABLE_MILESTONE_STATUSES.includes(status);
}

export function canReleaseMilestone(status: MilestoneStatus) {
  return RELEASABLE_MILESTONE_STATUSES.includes(status);
}

export function canRefundMilestone(status: MilestoneStatus) {
  return REFUNDABLE_MILESTONE_STATUSES.includes(status);
}

export function shouldApplyFundingEvent({
  status,
  currentPaymentIntentId,
  incomingPaymentIntentId,
}: {
  status: MilestoneStatus;
  currentPaymentIntentId?: string | null;
  incomingPaymentIntentId?: string | null;
}) {
  if (!incomingPaymentIntentId) return false;
  if (currentPaymentIntentId) return false;
  return canFundMilestone(status);
}
