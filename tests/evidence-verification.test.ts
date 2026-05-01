import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinkedEvidenceVerificationSummary,
  evaluateEvidenceSourceVerification,
  getEvidenceSystemCheckSummary,
  getEvidenceVerificationProfile,
} from "../src/lib/evidence-verification.ts";

test("evaluates provider evidence as ready when source has a provider link and milestone context", () => {
  const result = evaluateEvidenceSourceVerification({
    type: "RENDER",
    label: "Render webhook worker",
    url: "https://evidence-worker.onrender.com",
    status: "PENDING_VERIFICATION",
    metadata: {
      verification_note: "This service maps to Milestone 1 and proves the webhook worker health check.",
    },
  });

  assert.equal(result.providerLabel, "Render");
  assert.equal(result.stage, "ready");
  assert.equal(result.recommendedStatus, "CONNECTED");
  assert.ok(result.confidenceScore >= 80);
  assert.equal(result.checks.find((check) => check.key === "provider_fit")?.status, "passed");
  assert.ok(result.buyerReview.some((item) => item.includes("Buyer")));
});

test("keeps provider evidence pending when milestone mapping context is missing", () => {
  const result = evaluateEvidenceSourceVerification({
    type: "VERCEL",
    label: "Preview",
    url: "https://portal-preview.vercel.app",
    status: "PENDING_VERIFICATION",
    metadata: {},
  });

  assert.equal(result.stage, "pending");
  assert.equal(result.recommendedStatus, "PENDING_VERIFICATION");
  assert.ok(result.nextActions.some((item) => item.includes("verification note")));
});

test("marks provider evidence as needing attention when required link is missing", () => {
  const result = evaluateEvidenceSourceVerification({
    type: "SUPABASE",
    label: "Migration proof",
    url: null,
    status: "PENDING_VERIFICATION",
    metadata: {
      verification_note: "Migration evidence maps to Milestone 2 database handoff.",
    },
  });

  assert.equal(result.stage, "needs_attention");
  assert.equal(result.recommendedStatus, "NEEDS_ATTENTION");
  assert.ok(result.blockers.some((item) => item.includes("Supabase needs")));
});

test("exposes provider-specific setup contracts", () => {
  const github = getEvidenceVerificationProfile("GITHUB");
  const domain = getEvidenceVerificationProfile("DOMAIN");

  assert.equal(github.setupOwner, "FACILITATOR");
  assert.ok(github.milestoneUse.includes("Source handoff"));
  assert.equal(domain.setupOwner, "CLIENT");
  assert.ok(domain.proves.includes("Domain control"));
});

test("builds a milestone submission verification summary from linked sources", () => {
  const summary = buildLinkedEvidenceVerificationSummary([
    {
      id: "source_vercel",
      type: "VERCEL",
      label: "Client portal preview",
      url: "https://client-portal.vercel.app",
      status: "CONNECTED",
      metadata: {
        verification_note: "Maps to Milestone 1 and proves the deployed client portal workflow.",
      },
    },
    {
      id: "source_other",
      type: "OTHER",
      label: "Walkthrough recording",
      url: null,
      status: "PENDING_VERIFICATION",
      metadata: {},
    },
  ]);

  assert.equal(summary.total, 2);
  assert.equal(summary.readyCount, 1);
  assert.equal(summary.pendingCount, 1);
  assert.ok(summary.averageConfidence > 50);
  assert.match(summary.releaseSummary, /linked evidence/i);
  assert.match(summary.auditContext, /Vercel/i);
  assert.equal(summary.items[0].id, "source_vercel");
  assert.ok(summary.buyerReview.length > 0);
});

test("folds automated source checks into verification confidence and blockers", () => {
  const result = evaluateEvidenceSourceVerification({
    type: "VERCEL",
    label: "Unsafe preview",
    url: "http://preview.vercel.app",
    status: "PENDING_VERIFICATION",
    metadata: {
      verification_note: "Maps to Milestone 1 and proves the deployed workflow.",
      provider_system_check: {
        checkedAt: "2026-05-01T12:00:00.000Z",
        providerLabel: "Vercel",
        sourceType: "VERCEL",
        checks: [
          {
            key: "https",
            label: "HTTPS",
            detail: "Use an HTTPS provider link before relying on this evidence for escrow release.",
            status: "failed",
            critical: true,
          },
        ],
        signals: [],
        nextActions: ["Use an HTTPS provider link before relying on this evidence for escrow release."],
      },
    },
  });

  assert.equal(result.stage, "needs_attention");
  assert.ok(result.blockers.some((item) => item.includes("HTTPS")));
  assert.equal(result.checks.find((check) => check.key === "system_https")?.status, "attention");
});

test("reads persisted automated source check summaries from metadata", () => {
  const summary = getEvidenceSystemCheckSummary({
    provider_system_check: {
      checkedAt: "2026-05-01T12:00:00.000Z",
      providerLabel: "Render",
      sourceType: "RENDER",
      checks: [
        {
          key: "url_reachable",
          label: "URL reachable",
          detail: "The provider URL responded with HTTP 200.",
          status: "passed",
        },
      ],
      signals: ["Provider link responded during automated source check."],
      nextActions: [],
    },
  });

  assert.equal(summary?.providerLabel, "Render");
  assert.equal(summary?.checks[0].status, "passed");
});
