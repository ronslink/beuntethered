import type { MilestoneStatus, ProjectStatus } from "@prisma/client";

export const DISPUTABLE_PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "OPEN_BIDDING"];
export const DISPUTABLE_MILESTONE_STATUSES: MilestoneStatus[] = [
  "PENDING",
  "FUNDED_IN_ESCROW",
  "SUBMITTED_FOR_REVIEW",
];

export function canOpenDisputeForProject(status: ProjectStatus) {
  return DISPUTABLE_PROJECT_STATUSES.includes(status);
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
