export function buildBYOCInviteReviewNotification({
  projectId,
  projectTitle,
  facilitatorName,
  inviteToken,
  transitionMode,
}: {
  projectId: string;
  projectTitle: string;
  facilitatorName?: string | null;
  inviteToken: string;
  transitionMode?: string | null;
}) {
  const facilitator = facilitatorName || "A facilitator";

  return {
    message: `${facilitator} prepared a private BYOC delivery packet for "${projectTitle}". Review the scope, escrow totals, and evidence plan before claiming it.`,
    type: "MILESTONE" as const,
    href: `/invite/${inviteToken}`,
    sourceKey: `byoc_invite_ready_${projectId}`,
    metadata: {
      project_id: projectId,
      invite_token: inviteToken,
      byoc: true,
      transition_mode: transitionMode ?? null,
      next_action: "REVIEW_BYOC_PACKET",
    },
  };
}
