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

export function buildBYOCInviteDeliveryMetadata({
  invitedClientEmail,
  existingClientAccount,
  emailDelivery,
  inAppNotificationSent,
}: {
  invitedClientEmail: string | null;
  existingClientAccount: boolean;
  emailDelivery: { sent: true } | { sent: false; skipped?: string };
  inAppNotificationSent: boolean;
}) {
  return {
    operation: "BYOC_INVITE_DELIVERY_RECORDED",
    actor_project_role: "FACILITATOR",
    byoc: true,
    invited_client_email: invitedClientEmail,
    existing_client_account: existingClientAccount,
    email_delivery_sent: emailDelivery.sent,
    email_delivery_skipped: emailDelivery.sent ? null : emailDelivery.skipped ?? "UNKNOWN",
    in_app_notification_sent: inAppNotificationSent,
  };
}
