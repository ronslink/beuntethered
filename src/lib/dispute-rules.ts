import type { MilestoneStatus, ProjectStatus } from "@prisma/client";

export const DISPUTABLE_PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "OPEN_BIDDING"];
export const DISPUTABLE_MILESTONE_STATUSES: MilestoneStatus[] = [
  "PENDING",
  "FUNDED_IN_ESCROW",
  "SUBMITTED_FOR_REVIEW",
];

export const BYOC_DISPUTE_EXCLUSION_MESSAGE =
  "BYOC projects are not eligible for platform arbitration because the original client agreement originated outside Untether and cannot be certified by the platform.";

export function canOpenDisputeForProject(status: ProjectStatus) {
  return DISPUTABLE_PROJECT_STATUSES.includes(status);
}

export function getProjectDisputeEligibility({
  status,
  isByoc,
}: {
  status: ProjectStatus;
  isByoc: boolean;
}) {
  if (isByoc) {
    return {
      eligible: false,
      reason: BYOC_DISPUTE_EXCLUSION_MESSAGE,
      code: "BYOC_DISPUTE_EXCLUDED",
    } as const;
  }

  if (!canOpenDisputeForProject(status)) {
    return {
      eligible: false,
      reason: "Project cannot be disputed",
      code: "PROJECT_STATUS_NOT_DISPUTABLE",
    } as const;
  }

  return { eligible: true, reason: null, code: null } as const;
}

export function canOpenDisputeForMilestone(status: MilestoneStatus) {
  return DISPUTABLE_MILESTONE_STATUSES.includes(status);
}

export function canOpenDisputeRequester({
  isBuyerManager,
  isAssignedFacilitator,
}: {
  isBuyerManager: boolean;
  isAssignedFacilitator: boolean;
}) {
  return isBuyerManager || isAssignedFacilitator;
}
