import assert from "node:assert/strict";
import test from "node:test";
import {
  canOpenDisputeRequester,
  canOpenDisputeForMilestone,
  canOpenDisputeForProject,
} from "../src/lib/dispute-rules.ts";

test("disputes can only be opened on active buyer work", () => {
  assert.equal(canOpenDisputeForProject("ACTIVE"), true);
  assert.equal(canOpenDisputeForProject("OPEN_BIDDING"), true);
  assert.equal(canOpenDisputeForProject("COMPLETED"), false);
  assert.equal(canOpenDisputeForProject("DISPUTED"), false);
  assert.equal(canOpenDisputeForProject("CANCELLED"), false);
});

test("disputes cannot be opened after a milestone has been paid or already disputed", () => {
  assert.equal(canOpenDisputeForMilestone("PENDING"), true);
  assert.equal(canOpenDisputeForMilestone("FUNDED_IN_ESCROW"), true);
  assert.equal(canOpenDisputeForMilestone("SUBMITTED_FOR_REVIEW"), true);
  assert.equal(canOpenDisputeForMilestone("APPROVED_AND_PAID"), false);
  assert.equal(canOpenDisputeForMilestone("DISPUTED"), false);
});

test("disputes can be opened by buyer managers or assigned facilitators", () => {
  assert.equal(canOpenDisputeRequester({ isBuyerManager: true, isAssignedFacilitator: false }), true);
  assert.equal(canOpenDisputeRequester({ isBuyerManager: false, isAssignedFacilitator: true }), true);
  assert.equal(canOpenDisputeRequester({ isBuyerManager: false, isAssignedFacilitator: false }), false);
});
