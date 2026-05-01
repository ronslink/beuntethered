import assert from "node:assert/strict";
import test from "node:test";
import {
  getProfileViewDeduplicationStart,
  getProfileViewWindowStart,
  shouldRecordProfileView,
} from "../src/lib/profile-view-rules.ts";

test("profile view windows use seven-day reporting and daily deduplication", () => {
  const now = new Date("2026-05-01T15:30:00.000Z");

  assert.equal(getProfileViewWindowStart(now).toISOString(), "2026-04-24T15:30:00.000Z");
  assert.equal(getProfileViewDeduplicationStart(now).toISOString(), "2026-05-01T00:00:00.000Z");
});

test("profile views are recorded only for client views of another facilitator", () => {
  assert.equal(shouldRecordProfileView({ facilitatorId: "fac_1", viewerId: "client_1", viewerRole: "CLIENT" }), true);
  assert.equal(shouldRecordProfileView({ facilitatorId: "fac_1", viewerId: "fac_1", viewerRole: "FACILITATOR" }), false);
  assert.equal(shouldRecordProfileView({ facilitatorId: "fac_1", viewerId: "fac_2", viewerRole: "FACILITATOR" }), false);
  assert.equal(shouldRecordProfileView({ facilitatorId: "fac_1", viewerId: null, viewerRole: null }), false);
});
