import assert from "node:assert/strict";
import test from "node:test";
import { runEvidenceSourceSystemCheck } from "../src/lib/evidence-system-checks.ts";

test("runs provider source checks without requiring credentials", async () => {
  const summary = await runEvidenceSourceSystemCheck(
    {
      type: "VERCEL",
      label: "Client portal preview",
      url: "https://client-portal.vercel.app",
      status: "PENDING_VERIFICATION",
      metadata: {
        verification_note: "Maps to Milestone 1 and proves the deployed client portal workflow.",
      },
    },
    {
      now: new Date("2026-05-01T12:00:00.000Z"),
      fetcher: async () => new Response(null, { status: 200 }),
    },
  );

  assert.equal(summary.providerLabel, "Vercel");
  assert.equal(summary.checkedAt, "2026-05-01T12:00:00.000Z");
  assert.equal(summary.checks.find((check) => check.key === "url_present")?.status, "passed");
  assert.equal(summary.checks.find((check) => check.key === "provider_host")?.status, "passed");
  assert.equal(summary.checks.find((check) => check.key === "url_reachable")?.status, "passed");
  assert.ok(summary.signals.some((signal) => signal.includes("Provider link responded")));
});

test("records protected or sleeping services as pending instead of failing proof", async () => {
  const summary = await runEvidenceSourceSystemCheck(
    {
      type: "RAILWAY",
      label: "Private API",
      url: "https://api.up.railway.app",
      status: "PENDING_VERIFICATION",
      metadata: {
        verification_note: "Maps to Milestone 2 and proves the backend API endpoint exists for buyer review.",
      },
    },
    {
      fetcher: async () => {
        throw new Error("network unavailable");
      },
    },
  );

  assert.equal(summary.checks.find((check) => check.key === "url_reachable")?.status, "pending");
  assert.ok(summary.nextActions.some((item) => item.includes("private, sleeping, or protected")));
});

test("flags critical credential and URL problems", async () => {
  const summary = await runEvidenceSourceSystemCheck({
    type: "SUPABASE",
    label: "Migration proof",
    url: "http://supabase.example.com",
    status: "PENDING_VERIFICATION",
    metadata: {
      verification_note: "Maps to Milestone 3 but includes a service_role secret key in the note.",
    },
  });

  assert.equal(summary.checks.find((check) => check.key === "https")?.status, "failed");
  assert.equal(summary.checks.find((check) => check.key === "secret_hygiene")?.status, "failed");
  assert.equal(summary.checks.find((check) => check.key === "secret_hygiene")?.critical, true);
});
