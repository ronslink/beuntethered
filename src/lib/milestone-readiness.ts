import type { MilestoneStatus, PaymentKind, PaymentStatus } from "@prisma/client";

export type MilestoneReadinessItemStatus = "complete" | "pending" | "attention";

export type MilestoneReadinessItem = {
  key: "scope" | "escrow" | "delivery" | "audit" | "release";
  label: string;
  detail: string;
  status: MilestoneReadinessItemStatus;
};

export type MilestoneReadinessInput = {
  status: MilestoneStatus;
  acceptanceCriteriaCount: number;
  deliverablesCount: number;
  hasPreviewUrl: boolean;
  hasPayload: boolean;
  submissionAttachmentCount: number;
  latestAudit?: {
    isPassing: boolean;
    score: number;
  } | null;
  paymentRecords: Array<{
    kind: PaymentKind;
    status: PaymentStatus;
  }>;
};

function item(status: MilestoneReadinessItemStatus, label: string, detail: string, key: MilestoneReadinessItem["key"]) {
  return { key, label, detail, status };
}

export function getMilestoneReadiness(input: MilestoneReadinessInput) {
  const hasScope = input.acceptanceCriteriaCount > 0 && input.deliverablesCount > 0;
  const hasFunding =
    input.status !== "PENDING" ||
    input.paymentRecords.some((record) => record.kind === "MILESTONE_FUNDING" && record.status === "SUCCEEDED");
  const hasDelivery = input.hasPreviewUrl && input.hasPayload;
  const hasAudit = Boolean(input.latestAudit);
  const hasRelease =
    input.status === "APPROVED_AND_PAID" ||
    input.paymentRecords.some((record) => record.kind === "ESCROW_RELEASE" && record.status === "SUCCEEDED");

  const items: MilestoneReadinessItem[] = [
    item(
      hasScope ? "complete" : "attention",
      "Acceptance locked",
      hasScope
        ? `${input.acceptanceCriteriaCount} criteria and ${input.deliverablesCount} deliverables`
        : "Add criteria and deliverables before funding",
      "scope"
    ),
    item(
      hasFunding ? "complete" : "pending",
      "Escrow funded",
      hasFunding ? "Payment record is active" : "Client funding is the next step",
      "escrow"
    ),
    item(
      hasDelivery ? "complete" : input.status === "SUBMITTED_FOR_REVIEW" ? "attention" : "pending",
      "Delivery package",
      hasDelivery
        ? `${input.submissionAttachmentCount} evidence artifact${input.submissionAttachmentCount === 1 ? "" : "s"} linked`
        : "Preview URL and source archive required",
      "delivery"
    ),
    item(
      hasAudit ? (input.latestAudit?.isPassing ? "complete" : "attention") : input.status === "SUBMITTED_FOR_REVIEW" ? "pending" : "pending",
      "Audit report",
      hasAudit
        ? `${input.latestAudit?.isPassing ? "Passed" : "Needs work"} at ${input.latestAudit?.score ?? 0}% confidence`
        : "Generated after delivery submission",
      "audit"
    ),
    item(
      hasRelease ? "complete" : input.status === "DISPUTED" ? "attention" : "pending",
      "Release decision",
      hasRelease ? "Payment released and source unlocked" : input.status === "DISPUTED" ? "Awaiting dispute resolution" : "Buyer approval pending",
      "release"
    ),
  ];

  const completed = items.filter((readinessItem) => readinessItem.status === "complete").length;
  const score = Math.round((completed / items.length) * 100);

  return {
    score,
    items,
    nextAction: getMilestoneNextAction(input.status, hasDelivery, input.latestAudit ?? null),
  };
}

export function getMilestoneNextAction(
  status: MilestoneStatus,
  hasDelivery: boolean,
  latestAudit?: MilestoneReadinessInput["latestAudit"]
) {
  if (status === "PENDING") {
    return {
      client: "Fund escrow to unlock facilitator delivery.",
      facilitator: "Waiting for escrow funding before work can be submitted.",
    };
  }

  if (status === "FUNDED_IN_ESCROW") {
    return {
      client: "Escrow is funded. Await the facilitator delivery package.",
      facilitator: "Submit preview, source archive, and evidence for buyer review.",
    };
  }

  if (status === "SUBMITTED_FOR_REVIEW") {
    if (!hasDelivery) {
      return {
        client: "Delivery is incomplete. Request a preview and source archive before release.",
        facilitator: "Add the missing preview or source archive evidence.",
      };
    }
    if (latestAudit && !latestAudit.isPassing) {
      return {
        client: "Review audit gaps before approving, requesting fixes, or opening a dispute.",
        facilitator: "Address audit gaps and resubmit evidence before buyer approval.",
      };
    }
    return {
      client: "Review the audit, test the preview, then approve release or dispute.",
      facilitator: "Buyer review is in progress. Keep evidence ready for questions.",
    };
  }

  if (status === "APPROVED_AND_PAID") {
    return {
      client: "Source is unlocked and IP transfer is complete.",
      facilitator: "Milestone is paid and counts toward verified delivery history.",
    };
  }

  return {
    client: "Dispute review is active. Keep all evidence attached to the project.",
    facilitator: "Dispute review is active. Add evidence that maps to acceptance criteria.",
  };
}
