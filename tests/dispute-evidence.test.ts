import assert from "node:assert/strict";
import test from "node:test";
import { buildDisputeEvidenceContext } from "../src/lib/dispute-evidence.ts";

test("builds dispute context from milestone proof, audit, payment, and release evidence", () => {
  const context = buildDisputeEvidenceContext({
    id: "milestone_1",
    title: "Operations dashboard delivery",
    status: "SUBMITTED_FOR_REVIEW",
    description: "Submit a working preview, source package, and review evidence.",
    acceptance_criteria: ["Preview URL loads", "Dashboard workflow is documented"],
    deliverables: ["Preview deployment", "Source archive", "Evidence note"],
    live_preview_url: "https://preview.example.com",
    payload_storage_path: "https://local.blob/source.zip",
    attachments: [
      {
        id: "attachment_1",
        name: "review-evidence.txt",
        url: "https://local.blob/review-evidence.txt",
        purpose: "MILESTONE_SUBMISSION",
        content_type: "text/plain",
        size_bytes: 128,
        created_at: new Date("2026-04-28T10:00:00.000Z"),
      },
      {
        id: "attachment_2",
        name: "audit-evidence.txt",
        url: "https://local.blob/audit-evidence.txt",
        purpose: "AUDIT_EVIDENCE",
        content_type: "text/plain",
        size_bytes: 64,
        created_at: new Date("2026-04-28T10:05:00.000Z"),
      },
    ],
    audits: [
      {
        id: "audit_1",
        provider: "playwright",
        model: "smoke-auditor",
        score: 94,
        is_passing: true,
        criteria_met: ["Preview URL loads"],
        criteria_missed: [],
        summary: "The submitted dashboard passes the buyer-visible checks.",
        created_at: new Date("2026-04-28T10:10:00.000Z"),
      },
    ],
    payment_records: [
      {
        id: "payment_1",
        kind: "MILESTONE_FUNDING",
        status: "SUCCEEDED",
        gross_amount_cents: 420000,
        platform_fee_cents: 33600,
        facilitator_payout_cents: 420000,
        stripe_payment_intent_id: "pi_test",
        created_at: new Date("2026-04-28T09:00:00.000Z"),
      },
    ],
    activity_logs: [
      {
        action: "PAYMENT_RELEASED",
        entity_type: "PaymentRecord",
        entity_id: "payment_release_1",
        metadata: {
          approval_attestation: {
            testedPreview: true,
            reviewedEvidence: true,
          },
        },
        created_at: new Date("2026-04-28T10:15:00.000Z"),
      },
    ],
  });

  assert.equal(context.milestoneId, "milestone_1");
  assert.equal(context.proofPlan.reviewChecks.length, 2);
  assert.equal(context.proofPlan.requiredArtifacts.every((artifact) => artifact.available), true);
  assert.equal(context.submittedEvidence.length, 2);
  assert.equal(context.latestAudit?.score, 94);
  assert.equal(context.paymentStatus[0].status, "SUCCEEDED");
  assert.equal(context.releaseAttestations[0].action, "PAYMENT_RELEASED");
});
