import type { DisputeEvidenceContext } from "./dispute-evidence.ts";

export type ArbitrationStanding = "CLIENT" | "FACILITATOR";

export function getArbitrationPaymentKeys(milestoneId: string) {
  return {
    refundRecordKey: `refund_${milestoneId}`,
    refundStripeIdempotencyKey: `refund_${milestoneId}`,
    releaseRecordKey: `release_${milestoneId}`,
    releaseStripeIdempotencyKey: `release_escrow_${milestoneId}`,
  };
}

export function getArbitrationStatusError(status: string, standing: ArbitrationStanding) {
  if (status === "DISPUTED") return null;

  return standing === "CLIENT"
    ? "Only disputed milestones can be refunded through arbitration."
    : "Only disputed milestones can be released through arbitration.";
}

export function normalizeArbitrationResolutionNote(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

export function getArbitrationResolutionNoteError(value: unknown) {
  const note = normalizeArbitrationResolutionNote(value);
  if (note.length < 12) return "Add a short arbitration note explaining the evidence behind this ruling.";
  return null;
}

export function buildArbitrationEvidenceSummary(context: DisputeEvidenceContext) {
  return {
    milestone_id: context.milestoneId,
    milestone_status: context.milestoneStatus,
    proof_summary: context.proofPlan.summary,
    required_artifacts: context.proofPlan.requiredArtifacts.map((artifact) => ({
      key: artifact.key,
      label: artifact.label,
      available: artifact.available,
    })),
    submitted_evidence_count: context.submittedEvidence.length,
    latest_audit_score: context.latestAudit?.score ?? null,
    latest_audit_passing: context.latestAudit?.isPassing ?? null,
    payment_record_count: context.paymentStatus.length,
    release_attestation_count: context.releaseAttestations.length,
  };
}

export function buildArbitrationResolutionMetadata({
  standing,
  disputeId,
  arbiterId,
  stripeId,
  platformFeeCents,
  counterpartyAmountCents,
  latestAuditScore,
  latestAuditPassing,
  resolutionNote,
  evidenceSummary,
}: {
  standing: ArbitrationStanding;
  disputeId: string;
  arbiterId: string;
  stripeId: string;
  platformFeeCents: number;
  counterpartyAmountCents: number;
  latestAuditScore?: number | null;
  latestAuditPassing?: boolean | null;
  resolutionNote?: string;
  evidenceSummary?: ReturnType<typeof buildArbitrationEvidenceSummary>;
}) {
  const isClientStanding = standing === "CLIENT";

  return {
    operation: isClientStanding ? "ARBITRATION_REFUND" : "ARBITRATION_RELEASE",
    dispute_id: disputeId,
    arbiter_id: arbiterId,
    platform_fee_cents: platformFeeCents,
    latest_audit_score: latestAuditScore ?? null,
    latest_audit_passing: latestAuditPassing ?? null,
    resolution_note: resolutionNote || null,
    evidence_summary: evidenceSummary ?? null,
    ...(isClientStanding
      ? {
          stripe_refund_id: stripeId,
          client_refund_cents: counterpartyAmountCents,
        }
      : {
          stripe_transfer_id: stripeId,
          facilitator_payout_cents: counterpartyAmountCents,
        }),
  };
}
