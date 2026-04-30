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
