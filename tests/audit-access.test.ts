import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessMilestoneAuditRequester,
  isAuditPayloadForMilestone,
  isMilestoneAuditReady,
  normalizeAuditReference,
} from "../src/lib/audit-access.ts";

test("audit request access is limited to internal, buyer-side, or assigned facilitator actors", () => {
  assert.equal(canAccessMilestoneAuditRequester({
    isInternal: true,
    userId: null,
    milestoneFacilitatorId: "facilitator_1",
    hasBuyerProjectAccess: false,
  }), true);

  assert.equal(canAccessMilestoneAuditRequester({
    isInternal: false,
    userId: "buyer_1",
    milestoneFacilitatorId: "facilitator_1",
    hasBuyerProjectAccess: true,
  }), true);

  assert.equal(canAccessMilestoneAuditRequester({
    isInternal: false,
    userId: "facilitator_1",
    milestoneFacilitatorId: "facilitator_1",
    hasBuyerProjectAccess: false,
  }), true);

  assert.equal(canAccessMilestoneAuditRequester({
    isInternal: false,
    userId: "bidder_1",
    milestoneFacilitatorId: "facilitator_1",
    hasBuyerProjectAccess: false,
  }), false);
});

test("audit runs only after milestone evidence is submitted", () => {
  assert.equal(isMilestoneAuditReady("PENDING"), false);
  assert.equal(isMilestoneAuditReady("FUNDED_IN_ESCROW"), false);
  assert.equal(isMilestoneAuditReady("SUBMITTED_FOR_REVIEW"), true);
  assert.equal(isMilestoneAuditReady("APPROVED_AND_PAID"), false);
});

test("audit payload must match submitted milestone evidence", () => {
  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://preview.example.com/build",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: "https://local.blob/escrow/build.zip",
  }), true);

  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://local.blob/escrow/build.zip",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: "https://local.blob/escrow/build.zip",
  }), true);

  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://malicious.example.com/package.zip",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: "https://local.blob/escrow/build.zip",
  }), false);
});

test("audit payload matching tolerates signed urls and trailing slashes", () => {
  assert.equal(normalizeAuditReference(" https://local.blob/escrow/build.zip?sig=abc#download "), "https://local.blob/escrow/build.zip");

  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://local.blob/escrow/build.zip?sig=abc&expires=soon",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: "https://local.blob/escrow/build.zip",
  }), true);

  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://preview.example.com/build/?preview=true",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: null,
  }), true);

  assert.equal(isAuditPayloadForMilestone({
    payloadUrl: "https://local.blob/escrow/other-build.zip?sig=abc",
    livePreviewUrl: "https://preview.example.com/build",
    payloadStoragePath: "https://local.blob/escrow/build.zip",
  }), false);
});
