import assert from "node:assert/strict";
import test from "node:test";
import { getMilestoneReadiness } from "../src/lib/milestone-readiness.ts";

test("scores a paid milestone as fully release ready", () => {
  const readiness = getMilestoneReadiness({
    status: "APPROVED_AND_PAID",
    acceptanceCriteriaCount: 2,
    deliverablesCount: 2,
    hasPreviewUrl: true,
    hasPayload: true,
    submissionAttachmentCount: 2,
    latestAudit: { isPassing: true, score: 94 },
    paymentRecords: [
      { kind: "MILESTONE_FUNDING", status: "SUCCEEDED" },
      { kind: "ESCROW_RELEASE", status: "SUCCEEDED" },
    ],
  });

  assert.equal(readiness.score, 100);
  assert.equal(readiness.items.every((item) => item.status === "complete"), true);
  assert.match(readiness.nextAction.client, /source is unlocked/i);
});

test("flags submitted milestones without delivery evidence", () => {
  const readiness = getMilestoneReadiness({
    status: "SUBMITTED_FOR_REVIEW",
    acceptanceCriteriaCount: 2,
    deliverablesCount: 1,
    hasPreviewUrl: false,
    hasPayload: false,
    submissionAttachmentCount: 0,
    latestAudit: null,
    paymentRecords: [{ kind: "MILESTONE_FUNDING", status: "SUCCEEDED" }],
  });

  assert.equal(readiness.items.find((item) => item.key === "delivery")?.status, "attention");
  assert.match(readiness.nextAction.client, /delivery is incomplete/i);
});

test("surfaces failed audits as buyer and facilitator next actions", () => {
  const readiness = getMilestoneReadiness({
    status: "SUBMITTED_FOR_REVIEW",
    acceptanceCriteriaCount: 2,
    deliverablesCount: 2,
    hasPreviewUrl: true,
    hasPayload: true,
    submissionAttachmentCount: 1,
    latestAudit: { isPassing: false, score: 62 },
    paymentRecords: [{ kind: "MILESTONE_FUNDING", status: "SUCCEEDED" }],
  });

  assert.equal(readiness.items.find((item) => item.key === "audit")?.status, "attention");
  assert.match(readiness.nextAction.client, /audit gaps/i);
  assert.match(readiness.nextAction.facilitator, /resubmit evidence/i);
});
