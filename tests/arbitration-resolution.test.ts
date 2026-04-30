import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArbitrationEvidenceSummary,
  buildArbitrationResolutionMetadata,
  getArbitrationPaymentKeys,
  getArbitrationResolutionNoteError,
  getArbitrationStatusError,
  normalizeArbitrationResolutionNote,
} from "../src/lib/arbitration-resolution.ts";

test("builds stable arbitration payment idempotency keys", () => {
  assert.deepEqual(getArbitrationPaymentKeys("milestone_1"), {
    refundRecordKey: "refund_milestone_1",
    refundStripeIdempotencyKey: "refund_milestone_1",
    releaseRecordKey: "release_milestone_1",
    releaseStripeIdempotencyKey: "release_escrow_milestone_1",
  });
});

test("only disputed milestones can be resolved by arbitration", () => {
  assert.equal(getArbitrationStatusError("DISPUTED", "CLIENT"), null);
  assert.equal(
    getArbitrationStatusError("SUBMITTED_FOR_REVIEW", "CLIENT"),
    "Only disputed milestones can be refunded through arbitration."
  );
  assert.equal(
    getArbitrationStatusError("FUNDED_IN_ESCROW", "FACILITATOR"),
    "Only disputed milestones can be released through arbitration."
  );
});

test("builds auditable arbitration metadata for refund and release outcomes", () => {
  const evidenceSummary = {
    milestone_id: "milestone_1",
    milestone_status: "DISPUTED",
    proof_summary: "Preview and source package are required.",
    required_artifacts: [{ key: "preview", label: "Live preview", available: true }],
    submitted_evidence_count: 2,
    latest_audit_score: 64,
    latest_audit_passing: false,
    payment_record_count: 1,
    release_attestation_count: 0,
  };
  const refund = buildArbitrationResolutionMetadata({
    standing: "CLIENT",
    disputeId: "dispute_1",
    arbiterId: "admin_1",
    stripeId: "re_123",
    platformFeeCents: 33600,
    counterpartyAmountCents: 453600,
    latestAuditScore: 64,
    latestAuditPassing: false,
    resolutionNote: "Preview failed and required evidence was missing.",
    evidenceSummary,
  });

  assert.equal(refund.operation, "ARBITRATION_REFUND");
  assert.equal("stripe_refund_id" in refund ? refund.stripe_refund_id : null, "re_123");
  assert.equal("client_refund_cents" in refund ? refund.client_refund_cents : null, 453600);
  assert.equal(refund.latest_audit_passing, false);
  assert.equal(refund.resolution_note, "Preview failed and required evidence was missing.");
  assert.equal(refund.evidence_summary?.submitted_evidence_count, 2);

  const release = buildArbitrationResolutionMetadata({
    standing: "FACILITATOR",
    disputeId: "dispute_1",
    arbiterId: "admin_1",
    stripeId: "tr_123",
    platformFeeCents: 33600,
    counterpartyAmountCents: 420000,
    latestAuditScore: 94,
    latestAuditPassing: true,
  });

  assert.equal(release.operation, "ARBITRATION_RELEASE");
  assert.equal("stripe_transfer_id" in release ? release.stripe_transfer_id : null, "tr_123");
  assert.equal("facilitator_payout_cents" in release ? release.facilitator_payout_cents : null, 420000);
  assert.equal(release.latest_audit_score, 94);
});

test("requires and normalizes arbitration resolution notes", () => {
  assert.equal(normalizeArbitrationResolutionNote("  Evidence supports refund.  "), "Evidence supports refund.");
  assert.equal(
    getArbitrationResolutionNoteError("too short"),
    "Add a short arbitration note explaining the evidence behind this ruling."
  );
  assert.equal(getArbitrationResolutionNoteError("Evidence supports facilitator payout."), null);
});

test("summarizes arbitration evidence context for durable metadata", () => {
  const summary = buildArbitrationEvidenceSummary({
    milestoneId: "milestone_1",
    milestoneTitle: "Dashboard delivery",
    milestoneStatus: "DISPUTED",
    proofPlan: {
      summary: "Preview and source package are required.",
      deliverables: ["Preview"],
      acceptanceCriteria: ["Preview loads"],
      reviewChecks: ["Preview loads"],
      requiredArtifacts: [
        { key: "preview", label: "Live preview", detail: "A live URL must be submitted.", required: true, available: true },
      ],
    },
    previewUrl: "https://preview.example.com",
    hasPayloadPackage: true,
    submittedEvidence: [
      {
        id: "attachment_1",
        name: "evidence.txt",
        url: "https://local/evidence.txt",
        purpose: "MILESTONE_SUBMISSION",
        contentType: "text/plain",
        sizeBytes: 128,
        createdAt: "2026-04-28T10:00:00.000Z",
      },
    ],
    latestAudit: {
      id: "audit_1",
      provider: "playwright",
      model: "smoke",
      score: 91,
      isPassing: true,
      criteriaMet: ["Preview loads"],
      criteriaMissed: [],
      summary: "Passed",
      createdAt: "2026-04-28T10:05:00.000Z",
    },
    paymentStatus: [],
    releaseAttestations: [],
  });

  assert.equal(summary.milestone_status, "DISPUTED");
  assert.equal(summary.required_artifacts[0].available, true);
  assert.equal(summary.latest_audit_score, 91);
});
