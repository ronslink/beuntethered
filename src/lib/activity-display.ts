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
  ARBITRATION_REFUND: "Arbitration refund",
  ARBITRATION_RELEASE: "Arbitration release",
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

function getEvidenceSummary(metadata: ActivityMetadata) {
  const summary = metadata.evidence_summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  return summary as Record<string, unknown>;
}

function getScopeValidationReport(metadata: ActivityMetadata) {
  const report = metadata.scope_validation_report;
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  return report as {
    overallStatus?: unknown;
    items?: unknown;
  };
}

function getScopeValidationItem(
  report: ReturnType<typeof getScopeValidationReport>,
  key: string
) {
  if (!report || !Array.isArray(report.items)) return null;
  const item = report.items.find((entry) => (
    entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    (entry as Record<string, unknown>).key === key
  ));
  return item && typeof item === "object" && !Array.isArray(item)
    ? item as Record<string, unknown>
    : null;
}

function formatValidationStatus(value: unknown) {
  return typeof value === "string" ? value.replace(/_/g, " ") : "unknown";
}

export function getActivityEvidenceDetails(metadata: ActivityMetadata): ActivityEvidenceDetail[] {
  const operation = typeof metadata.operation === "string" ? metadata.operation : null;

  if (operation === "PROJECT_POSTED") {
    const report = getScopeValidationReport(metadata);
    if (!report) {
      return typeof metadata.milestone_count === "number"
        ? [{ label: "Milestones", value: String(metadata.milestone_count), tone: "neutral" }]
        : [];
    }

    const status = report.overallStatus === "passed" ? "passed" : "needs attention";
    const budget = getScopeValidationItem(report, "budget");
    const timeline = getScopeValidationItem(report, "timeline");
    const regions = getScopeValidationItem(report, "regions");
    const components = getScopeValidationItem(report, "components");
    const evidence = getScopeValidationItem(report, "milestoneEvidence");
    const details: Array<ActivityEvidenceDetail | null> = [
      { label: "Scope validation", value: status, tone: status === "passed" ? "positive" : "attention" },
      typeof metadata.milestone_count === "number"
        ? { label: "Milestones", value: String(metadata.milestone_count), tone: "neutral" }
        : null,
      budget ? { label: "Budget", value: formatValidationStatus(budget.status), tone: budget.status === "passed" ? "positive" : "attention" } : null,
      timeline ? { label: "Timeline", value: formatValidationStatus(timeline.status), tone: timeline.status === "passed" ? "positive" : "attention" } : null,
      regions ? { label: "Regions", value: formatValidationStatus(regions.status), tone: regions.status === "passed" ? "positive" : "attention" } : null,
      components ? { label: "Components", value: formatValidationStatus(components.status), tone: components.status === "passed" ? "positive" : "attention" } : null,
      evidence ? { label: "Evidence", value: formatValidationStatus(evidence.status), tone: evidence.status === "passed" ? "positive" : "attention" } : null,
    ];
    return details.filter((detail): detail is ActivityEvidenceDetail => Boolean(detail));
  }

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

  if (
    operation === "ARBITRATION_REFUND" ||
    operation === "ARBITRATION_RELEASE" ||
    metadata.arbitration_refund === true ||
    metadata.arbitration_release === true ||
    typeof metadata.standing === "string"
  ) {
    const evidenceSummary = getEvidenceSummary(metadata);
    const standing = typeof metadata.standing === "string" ? metadata.standing : null;
    const clientRefund = formatCents(metadata.client_refund_cents);
    const facilitatorPayout = formatCents(metadata.facilitator_payout_cents);
    const latestAuditScore = evidenceSummary?.latest_audit_score ?? metadata.latest_audit_score;
    const latestAuditPassing = evidenceSummary?.latest_audit_passing ?? metadata.latest_audit_passing;
    const details: Array<ActivityEvidenceDetail | null> = [
      standing ? { label: "Ruling", value: formatMetadataValue(standing) ?? standing, tone: "attention" } : null,
      clientRefund ? { label: "Client refund", value: clientRefund, tone: "attention" } : null,
      facilitatorPayout ? { label: "Payout", value: facilitatorPayout, tone: "positive" } : null,
      typeof latestAuditScore === "number"
        ? {
            label: "Audit",
            value: `${latestAuditScore}%${latestAuditPassing === false ? " failed" : ""}`,
            tone: latestAuditPassing === false ? "attention" : "positive",
          }
        : null,
      typeof evidenceSummary?.submitted_evidence_count === "number"
        ? { label: "Evidence", value: String(evidenceSummary.submitted_evidence_count), tone: "neutral" }
        : null,
      typeof evidenceSummary?.release_attestation_count === "number" && evidenceSummary.release_attestation_count > 0
        ? { label: "Attestations", value: String(evidenceSummary.release_attestation_count), tone: "positive" }
        : null,
    ];
    return details.filter((detail): detail is ActivityEvidenceDetail => Boolean(detail));
  }

  return [];
}

export function getActivityNarrative(metadata: ActivityMetadata) {
  if (typeof metadata.resolution_note === "string" && metadata.resolution_note.trim()) {
    return metadata.resolution_note.trim();
  }

  const evidenceSummary = getEvidenceSummary(metadata);
  if (typeof evidenceSummary?.proof_summary === "string" && evidenceSummary.proof_summary.trim()) {
    return evidenceSummary.proof_summary.trim();
  }

  if (metadata.operation === "PROJECT_POSTED") {
    const report = getScopeValidationReport(metadata);
    if (report?.overallStatus === "passed") {
      return "Scope validation passed before marketplace posting.";
    }
    if (report?.overallStatus === "needs_attention") {
      return "Scope validation found items to review before facilitator delivery.";
    }
  }

  return null;
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
