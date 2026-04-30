export type ActivityMetadata = Record<string, unknown>;

export type ActivityProjectLink = {
  id: string;
  title?: string | null;
  status?: string | null;
};

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Project created",
  PROJECT_POSTED: "Project posted",
  BID_SUBMITTED: "Bid submitted",
  BID_SHORTLISTED: "Bid shortlisted",
  NEGOTIATION_STARTED: "Negotiation started",
  BID_COUNTERED: "Counter offer sent",
  BID_ACCEPTED: "Proposal accepted",
  BID_REJECTED: "Bid rejected",
  BIDDING_REOPENED: "Bidding reopened",
  INVITE_SENT: "Invite sent",
  INVITE_RESPONDED: "Invite responded",
  INVITE_VIEWED: "Invite viewed",
  INVITE_ACCEPTED_BY_PROPOSAL: "Invite accepted by proposal",
  BYOC_INVITE_CREATED: "BYOC invite created",
  BYOC_INVITE_CLAIMED: "BYOC invite claimed",
  BYOC_INVITE_DELIVERY_RECORDED: "BYOC invite delivery recorded",
  BYOC_REGISTERED_CLIENT_PROJECT_CREATED: "BYOC client project created",
  LISTING_ARCHIVED: "Listing archived",
  SOW_UPDATED: "Scope updated",
  SQUAD_ACCEPTED: "Squad accepted",
  MESSAGE_SENT: "Message sent",
  MILESTONE_FUNDED: "Milestone funded",
  MILESTONE_SUBMITTED: "Milestone submitted",
  AUDIT_COMPLETED: "Audit completed",
  MILESTONE_APPROVED: "Milestone approved",
  PAYMENT_RELEASED: "Payment released",
  DISPUTE_OPENED: "Dispute opened",
  DISPUTE_RESOLVED: "Dispute resolved",
};

export function getActivityMetadata(metadata: unknown): ActivityMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as ActivityMetadata;
}

export function getActivityLabel(action: string, metadata: ActivityMetadata = {}) {
  const operation = typeof metadata.operation === "string" ? metadata.operation : action;
  return ACTIVITY_ACTION_LABELS[operation] ?? operation.replace(/_/g, " ").toLowerCase();
}

export function getActorScopeLabel(metadata: ActivityMetadata, fallbackRole?: string | null) {
  if (metadata.actor_scope === "PROJECT_OWNER") return "Project owner";
  if (metadata.actor_scope === "WORKSPACE_ADMIN") return "Workspace admin";
  if (metadata.actor_scope === "WORKSPACE_MEMBER") return "Workspace member";
  if (metadata.actor_project_role === "FACILITATOR") return "Facilitator";
  return fallbackRole ? fallbackRole.toLowerCase() : "System";
}

export function isWorkspaceAdminActivity(metadata: ActivityMetadata) {
  return metadata.workspace_admin_action === true;
}

function formatCents(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatMetadataValue(value: unknown) {
  if (typeof value !== "string") return null;
  return value.replace(/_/g, " ").toLowerCase();
}

export type ActivityEvidenceDetail = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "attention";
};

export function getActivityEvidenceDetails(metadata: ActivityMetadata): ActivityEvidenceDetail[] {
  const operation = typeof metadata.operation === "string" ? metadata.operation : null;

  if (operation === "BYOC_INVITE_CREATED") {
    const clientTotal = formatCents(metadata.client_total_cents);
    const facilitatorPayout = formatCents(metadata.facilitator_payout_cents);
    const details: Array<ActivityEvidenceDetail | null> = [
      typeof metadata.milestone_count === "number"
        ? { label: "Milestones", value: String(metadata.milestone_count), tone: "neutral" }
        : null,
      clientTotal ? { label: "Client total", value: clientTotal, tone: "neutral" } : null,
      facilitatorPayout ? { label: "Facilitator payout", value: facilitatorPayout, tone: "positive" } : null,
      metadata.invited_client_email
        ? { label: "Client email", value: String(metadata.invited_client_email), tone: "neutral" }
        : null,
    ];
    return details.filter((detail): detail is ActivityEvidenceDetail => Boolean(detail));
  }

  if (operation === "BYOC_INVITE_DELIVERY_RECORDED") {
    return [
      metadata.email_delivery_sent === true
        ? { label: "Email", value: "sent", tone: "positive" as const }
        : { label: "Email", value: formatMetadataValue(metadata.email_delivery_skipped) ?? "not sent", tone: "attention" as const },
      {
        label: "Buyer account",
        value: metadata.existing_client_account === true ? "existing" : "not matched",
        tone: metadata.existing_client_account === true ? "positive" : "neutral",
      },
      {
        label: "In-app action",
        value: metadata.in_app_notification_sent === true ? "created" : "not created",
        tone: metadata.in_app_notification_sent === true ? "positive" : "attention",
      },
    ];
  }

  if (operation === "BYOC_INVITE_CLAIMED") {
    const firstMilestoneAmount = formatCents(metadata.first_milestone_amount_cents);
    const details: Array<ActivityEvidenceDetail | null> = [
      metadata.transition_mode
        ? { label: "Transition", value: String(metadata.transition_mode), tone: "neutral" }
        : null,
      metadata.first_milestone_title
        ? { label: "First milestone", value: String(metadata.first_milestone_title), tone: "neutral" }
        : null,
      firstMilestoneAmount ? { label: "Funding target", value: firstMilestoneAmount, tone: "neutral" } : null,
      metadata.next_action
        ? { label: "Next action", value: formatMetadataValue(metadata.next_action) ?? String(metadata.next_action), tone: "attention" }
        : null,
    ];
    return details.filter((detail): detail is ActivityEvidenceDetail => Boolean(detail));
  }

  return [];
}

export function getProjectActivityHref(project: ActivityProjectLink) {
  return project.status === "OPEN_BIDDING" || project.status === "DRAFT" || project.status === "CANCELLED"
    ? `/projects/${project.id}`
    : `/command-center/${project.id}`;
}

export function buildActivityNotificationCopy({
  action,
  metadata,
  projectTitle,
  actorName,
  actorRole,
}: {
  action: string;
  metadata: unknown;
  projectTitle: string;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  const normalizedMetadata = getActivityMetadata(metadata);
  const label = getActivityLabel(action, normalizedMetadata);
  const scope = getActorScopeLabel(normalizedMetadata, actorRole);
  const actor = actorName || "System";

  return {
    message: `${label} on "${projectTitle}"`,
    detail: `${actor} - ${scope}`,
    isWorkspaceAdmin: isWorkspaceAdminActivity(normalizedMetadata),
  };
}
