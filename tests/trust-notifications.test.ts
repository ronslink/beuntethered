import assert from "node:assert/strict";
import test from "node:test";
import { buildTrustNotificationCopy } from "../src/lib/trust-notification-copy.ts";

test("trust notification copy distinguishes audit outcomes", () => {
  const passed = buildTrustNotificationCopy({
    kind: "AUDIT_COMPLETED",
    projectTitle: "Ops Portal",
    auditPassed: true,
  });
  assert.equal(passed.type, "SUCCESS");
  assert.match(passed.message, /passed/);

  const failed = buildTrustNotificationCopy({
    kind: "AUDIT_COMPLETED",
    projectTitle: "Ops Portal",
    auditPassed: false,
  });
  assert.equal(failed.type, "WARNING");
  assert.match(failed.message, /needs review/);
});

test("trust notification copy distinguishes dispute resolution standing", () => {
  assert.equal(
    buildTrustNotificationCopy({
      kind: "DISPUTE_RESOLVED",
      projectTitle: "Ops Portal",
      standing: "CLIENT",
    }).type,
    "WARNING"
  );
  assert.equal(
    buildTrustNotificationCopy({
      kind: "DISPUTE_RESOLVED",
      projectTitle: "Ops Portal",
      standing: "FACILITATOR",
    }).type,
    "SUCCESS"
  );
});
