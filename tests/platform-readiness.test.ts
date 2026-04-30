import assert from "node:assert/strict";
import test from "node:test";
import { buildPlatformReadinessReport } from "../src/lib/platform-readiness.ts";

const readyEnv = {
  DATABASE_URL: "postgresql://example",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NEXTAUTH_SECRET: "x".repeat(40),
  ENCRYPTION_MASTER_KEY: "a".repeat(64),
  INTERNAL_API_SECRET: "b".repeat(40),
  CRON_SECRET: "c".repeat(40),
  STRIPE_SECRET_KEY: "sk_test_enterprise",
  STRIPE_WEBHOOK_SECRET: "whsec_enterprise",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_enterprise",
  MINIMAX_API_KEY: "minimax-key",
  GROQ_API_KEY: "groq-key",
  RESEND_API_KEY: "re_key",
  EMAIL_FROM: "Untether Ops <ops@example.com>",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_token",
  GITHUB_WEBHOOK_SECRET: "github-secret",
  ADMIN_EMAIL: "admin@example.com",
};

test("platform readiness reports all-ready production configuration", () => {
  const report = buildPlatformReadinessReport(readyEnv, new Date("2026-04-29T00:00:00.000Z"));

  assert.equal(report.generatedAt, "2026-04-29T00:00:00.000Z");
  assert.equal(report.overallStatus, "READY");
  assert.equal(report.summary.BLOCKED, 0);
  assert.equal(report.summary.WARNING, 0);
  assert.ok(report.summary.READY > 0);
});

test("platform readiness blocks missing marketplace-critical configuration", () => {
  const report = buildPlatformReadinessReport({}, new Date("2026-04-29T00:00:00.000Z"));

  assert.equal(report.overallStatus, "BLOCKED");
  assert.ok(report.summary.BLOCKED >= 6);
  assert.ok(report.checks.some((check) => check.id === "stripe-secret" && check.status === "BLOCKED"));
  assert.ok(report.checks.some((check) => check.id === "ai-trusted" && check.status === "BLOCKED"));
});

test("platform readiness warns on non-critical launch configuration", () => {
  const report = buildPlatformReadinessReport({
    ...readyEnv,
    RESEND_API_KEY: "",
    BLOB_READ_WRITE_TOKEN: "test_token_local_blob_fallback",
    GITHUB_WEBHOOK_SECRET: "",
  });

  assert.equal(report.overallStatus, "WARNING");
  assert.equal(report.summary.BLOCKED, 0);
  assert.ok(report.checks.some((check) => check.id === "email-provider" && check.status === "WARNING"));
  assert.ok(report.checks.some((check) => check.id === "attachment-storage" && check.status === "WARNING"));
});

test("platform readiness blocks missing platform admin account when checked", () => {
  const report = buildPlatformReadinessReport(
    readyEnv,
    new Date("2026-04-29T00:00:00.000Z"),
    { platformAdminAccountExists: false }
  );

  assert.equal(report.overallStatus, "BLOCKED");
  assert.ok(
    report.checks.some(
      (check) => check.id === "platform-admin-account" && check.status === "BLOCKED"
    )
  );
});
