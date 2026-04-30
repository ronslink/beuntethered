import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAttachment,
  canAccessEscrowPayload,
  isEscrowPayloadAttachment,
  isEscrowPayloadLockedForUser,
} from "../src/lib/attachment-access.ts";

const baseAttachment = {
  uploader_id: "facilitator_1",
  project_id: "project_1",
  url: "https://local.blob/evidence.txt",
  purpose: "MILESTONE_SUBMISSION",
  project: {
    client_id: "client_1",
    creator_id: "client_1",
    organization: { members: [] },
    milestones: [{ facilitator_id: "facilitator_1" }],
  },
  milestone: {
    facilitator_id: "facilitator_1",
    status: "SUBMITTED_FOR_REVIEW",
    payload_storage_path: "https://local.blob/source.zip",
  },
  dispute: null,
};

test("allows buyer, uploader, assigned facilitator, and platform admin to access evidence", () => {
  assert.equal(canAccessAttachment({ id: "client_1" }, baseAttachment), true);
  assert.equal(canAccessAttachment({ id: "facilitator_1" }, baseAttachment), true);
  assert.equal(
    canAccessAttachment({ id: "admin_1", email: "admin@untether.network" }, baseAttachment),
    true
  );
});

test("does not allow bid-only users to access private evidence", () => {
  assert.equal(canAccessAttachment({ id: "bidder_1" }, baseAttachment), false);
});

test("locks escrow payload from buyers until approval while keeping uploader access", () => {
  const payloadAttachment = {
    ...baseAttachment,
    url: "https://local.blob/source.zip",
  };

  assert.equal(isEscrowPayloadAttachment(payloadAttachment), true);
  assert.equal(canAccessAttachment({ id: "client_1" }, payloadAttachment), false);
  assert.equal(canAccessAttachment({ id: "facilitator_1" }, payloadAttachment), true);
});

test("unlocks escrow payload for buyers after milestone approval", () => {
  const approvedPayload = {
    ...baseAttachment,
    url: "https://local.blob/source.zip",
    milestone: {
      ...baseAttachment.milestone,
      status: "APPROVED_AND_PAID",
    },
  };

  assert.equal(canAccessAttachment({ id: "client_1" }, approvedPayload), true);
});

test("allows dispute participants to access dispute evidence", () => {
  const disputeEvidence = {
    ...baseAttachment,
    project: null,
    milestone: null,
    dispute: {
      client_id: "client_1",
      facilitator_id: "facilitator_1",
    },
  };

  assert.equal(canAccessAttachment({ id: "client_1" }, disputeEvidence), true);
  assert.equal(canAccessAttachment({ id: "facilitator_1" }, disputeEvidence), true);
  assert.equal(canAccessAttachment({ id: "other_user" }, disputeEvidence), false);
});

test("escrow payload download follows buyer workspace and facilitator access rules", () => {
  const payload = {
    facilitator_id: "facilitator_1",
    status: "SUBMITTED_FOR_REVIEW",
    payload_storage_path: "https://local.blob/source.zip",
    project: {
      client_id: "client_1",
      creator_id: "client_1",
      organization: { members: [{ user_id: "workspace_admin_1" }] },
    },
  };

  assert.equal(canAccessEscrowPayload({ id: "facilitator_1" }, payload), true);
  assert.equal(canAccessEscrowPayload({ id: "workspace_admin_1" }, payload), false);
  assert.equal(isEscrowPayloadLockedForUser({ id: "workspace_admin_1" }, payload), true);
  assert.equal(canAccessEscrowPayload({ id: "bidder_1" }, payload), false);

  const approvedPayload = { ...payload, status: "APPROVED_AND_PAID" };
  assert.equal(canAccessEscrowPayload({ id: "workspace_admin_1" }, approvedPayload), true);
});
