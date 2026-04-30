import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManualVerificationEvidence,
  canManuallyReviewVerificationType,
  normalizeManualVerificationNote,
} from "../src/lib/manual-verification-review.ts";

test("manual verification review is limited to portfolio and business checks", () => {
  assert.equal(canManuallyReviewVerificationType("PORTFOLIO"), true);
  assert.equal(canManuallyReviewVerificationType("BUSINESS"), true);
  assert.equal(canManuallyReviewVerificationType("IDENTITY"), false);
  assert.equal(canManuallyReviewVerificationType("STRIPE"), false);
});

test("manual verification notes are normalized and bounded", () => {
  const longNote = `  Needs   updated evidence. ${"x".repeat(600)}`;
  const note = normalizeManualVerificationNote(longNote);

  assert.equal(note.startsWith("Needs updated evidence."), true);
  assert.equal(note.length, 500);
});

test("manual verification evidence preserves profile evidence and review metadata", () => {
  const evidence = buildManualVerificationEvidence({
    existingEvidence: { portfolio_url: "https://example.com" },
    reviewerId: "admin_1",
    status: "VERIFIED",
    note: "Looks complete.",
  });

  assert.deepEqual(evidence.profile_evidence, { portfolio_url: "https://example.com" });
  assert.equal(evidence.manual_review.reviewer_id, "admin_1");
  assert.equal(evidence.manual_review.status, "VERIFIED");
  assert.equal(evidence.manual_review.note, "Looks complete.");
  assert.match(evidence.manual_review.reviewed_at, /^\d{4}-\d{2}-\d{2}T/);
});
