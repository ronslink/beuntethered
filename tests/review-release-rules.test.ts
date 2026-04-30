import test from "node:test";
import assert from "node:assert/strict";
import {
  getAuditReleaseStatusFromLatestAudit,
  getReviewReleaseState,
} from "../src/lib/review-release-rules.ts";

test("review release stays blocked until buyer checklist is complete", () => {
  const state = getReviewReleaseState({
    testedPreview: true,
    reviewedEvidence: false,
    acceptsRelease: true,
    auditStatus: "SUCCESS",
  });

  assert.equal(state.canRelease, false);
  assert.equal(state.label, "Complete Review");
});

test("review release waits for pending audit even after checklist is complete", () => {
  const state = getReviewReleaseState({
    testedPreview: true,
    reviewedEvidence: true,
    acceptsRelease: true,
    auditStatus: "PENDING",
  });

  assert.equal(state.canRelease, false);
  assert.equal(state.label, "Audit Pending");
});

test("review release permits approval once evidence checklist and audit result exist", () => {
  const state = getReviewReleaseState({
    testedPreview: true,
    reviewedEvidence: true,
    acceptsRelease: true,
    auditStatus: "SUCCESS",
  });

  assert.equal(state.canRelease, true);
  assert.equal(state.label, "Approve & Pay");
});

test("review release requires explicit buyer override for failed audits", () => {
  const state = getReviewReleaseState({
    testedPreview: true,
    reviewedEvidence: true,
    acceptsRelease: true,
    auditStatus: "FAILED",
  });

  assert.equal(state.canRelease, false);
  assert.equal(state.label, "Override Required");
});

test("review release allows failed audit only with override acknowledgment and reason", () => {
  const state = getReviewReleaseState({
    testedPreview: true,
    reviewedEvidence: true,
    acceptsRelease: true,
    auditStatus: "FAILED",
    failedAuditOverrideAccepted: true,
    failedAuditOverrideReason: "The flagged criterion was verified manually in the staging preview.",
  });

  assert.equal(state.canRelease, true);
  assert.equal(state.label, "Approve & Pay");
});

test("server-side audit release status is derived from durable audit records", () => {
  assert.equal(getAuditReleaseStatusFromLatestAudit(null), "PENDING");
  assert.equal(getAuditReleaseStatusFromLatestAudit({ is_passing: true }), "SUCCESS");
  assert.equal(getAuditReleaseStatusFromLatestAudit({ is_passing: false }), "FAILED");
});
