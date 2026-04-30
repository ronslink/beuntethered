import { getMilestoneProofPlan, type MilestoneProofInput, type MilestoneProofPlan } from "./milestone-proof.ts";

type EvidenceAttachmentInput = {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  purpose?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
  created_at?: unknown;
};

type EvidenceAuditInput = {
  id?: unknown;
  provider?: unknown;
  model?: unknown;
  score?: unknown;
  is_passing?: unknown;
  criteria_met?: unknown;
  criteria_missed?: unknown;
  summary?: unknown;
  created_at?: unknown;
};

type EvidencePaymentInput = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  gross_amount_cents?: unknown;
  platform_fee_cents?: unknown;
  facilitator_payout_cents?: unknown;
  stripe_payment_intent_id?: unknown;
  stripe_transfer_id?: unknown;
  stripe_refund_id?: unknown;
  created_at?: unknown;
};

type EvidenceActivityInput = {
  action?: unknown;
  entity_type?: unknown;
  entity_id?: unknown;
  metadata?: unknown;
  created_at?: unknown;
};

export type DisputeEvidenceMilestoneInput = Omit<MilestoneProofInput, "attachments"> & {
  id?: unknown;
  status?: unknown;
  audits?: EvidenceAuditInput[];
  attachments?: EvidenceAttachmentInput[];
  payment_records?: EvidencePaymentInput[];
  activity_logs?: EvidenceActivityInput[];
};

export type DisputeEvidenceContext = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneStatus: string;
  proofPlan: MilestoneProofPlan;
  previewUrl: string | null;
  hasPayloadPackage: boolean;
  submittedEvidence: Array<{
    id: string;
    name: string;
    url: string;
    purpose: string;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: string | null;
  }>;
  latestAudit: {
    id: string;
    provider: string;
    model: string;
    score: number;
    isPassing: boolean;
    criteriaMet: string[];
    criteriaMissed: string[];
    summary: string;
    createdAt: string | null;
  } | null;
  paymentStatus: Array<{
    id: string;
    kind: string;
    status: string;
    grossAmountCents: number | null;
    platformFeeCents: number | null;
    facilitatorPayoutCents: number | null;
    stripePaymentIntentId: string | null;
    stripeTransferId: string | null;
    stripeRefundId: string | null;
    createdAt: string | null;
  }>;
  releaseAttestations: Array<{
    action: string;
    entityType: string;
    entityId: string;
    metadata: unknown;
    createdAt: string | null;
  }>;
};

const SUBMISSION_EVIDENCE_PURPOSES = new Set(["MILESTONE_SUBMISSION", "AUDIT_EVIDENCE"]);
const RELEASE_ACTIONS = new Set(["MILESTONE_APPROVED", "PAYMENT_RELEASED"]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean)
    : [];
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = clean(value);
  return text || null;
}

function jsonSafe(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return {};
  }
}

export function buildDisputeEvidenceContext(
  milestone: DisputeEvidenceMilestoneInput
): DisputeEvidenceContext {
  const proofPlan = getMilestoneProofPlan(milestone);
  const attachments = Array.isArray(milestone.attachments) ? milestone.attachments : [];
  const audits = Array.isArray(milestone.audits) ? milestone.audits : [];
  const paymentRecords = Array.isArray(milestone.payment_records) ? milestone.payment_records : [];
  const activityLogs = Array.isArray(milestone.activity_logs) ? milestone.activity_logs : [];
  const submittedEvidence = attachments
    .filter((attachment) => SUBMISSION_EVIDENCE_PURPOSES.has(clean(attachment.purpose)))
    .map((attachment) => ({
      id: clean(attachment.id),
      name: clean(attachment.name) || "Evidence artifact",
      url: clean(attachment.url),
      purpose: clean(attachment.purpose) || "GENERAL",
      contentType: clean(attachment.content_type) || null,
      sizeBytes: numberOrNull(attachment.size_bytes),
      createdAt: toIso(attachment.created_at),
    }))
    .filter((attachment) => attachment.url || attachment.name);

  const latestAudit = audits[0]
    ? {
        id: clean(audits[0].id),
        provider: clean(audits[0].provider) || "unknown",
        model: clean(audits[0].model) || "unknown",
        score: numberOrNull(audits[0].score) ?? 0,
        isPassing: booleanValue(audits[0].is_passing),
        criteriaMet: list(audits[0].criteria_met),
        criteriaMissed: list(audits[0].criteria_missed),
        summary: clean(audits[0].summary),
        createdAt: toIso(audits[0].created_at),
      }
    : null;

  return {
    milestoneId: clean(milestone.id),
    milestoneTitle: clean(milestone.title) || "Untitled milestone",
    milestoneStatus: clean(milestone.status) || "UNKNOWN",
    proofPlan,
    previewUrl: clean(milestone.live_preview_url) || null,
    hasPayloadPackage: Boolean(clean(milestone.payload_storage_path)) || submittedEvidence.some(
      (attachment) => attachment.purpose === "MILESTONE_SUBMISSION"
    ),
    submittedEvidence,
    latestAudit,
    paymentStatus: paymentRecords.slice(0, 6).map((record) => ({
      id: clean(record.id),
      kind: clean(record.kind) || "UNKNOWN",
      status: clean(record.status) || "UNKNOWN",
      grossAmountCents: numberOrNull(record.gross_amount_cents),
      platformFeeCents: numberOrNull(record.platform_fee_cents),
      facilitatorPayoutCents: numberOrNull(record.facilitator_payout_cents),
      stripePaymentIntentId: clean(record.stripe_payment_intent_id) || null,
      stripeTransferId: clean(record.stripe_transfer_id) || null,
      stripeRefundId: clean(record.stripe_refund_id) || null,
      createdAt: toIso(record.created_at),
    })),
    releaseAttestations: activityLogs
      .filter((activity) => RELEASE_ACTIONS.has(clean(activity.action)))
      .slice(0, 4)
      .map((activity) => ({
        action: clean(activity.action) || "UNKNOWN",
        entityType: clean(activity.entity_type) || "UNKNOWN",
        entityId: clean(activity.entity_id),
        metadata: jsonSafe(activity.metadata),
        createdAt: toIso(activity.created_at),
      })),
  };
}
