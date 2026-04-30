import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPortfolioEvidence,
  buildStripeConnectEvidence,
  buildVerificationNotificationCopy,
  resolvePortfolioVerificationStatus,
  resolveStripeConnectVerificationStatus,
  resolveStripeIdentityVerificationStatus,
} from "../src/lib/facilitator-verification-rules.ts";

test("resolves Stripe Connect verification from payout readiness", () => {
  assert.equal(resolveStripeConnectVerificationStatus({
    id: "acct_ready",
    details_submitted: true,
    payouts_enabled: true,
    charges_enabled: true,
    requirements: { currently_due: [], past_due: [] },
  }), "VERIFIED");

  assert.equal(resolveStripeConnectVerificationStatus({
    id: "acct_pending",
    details_submitted: true,
    payouts_enabled: false,
    requirements: { currently_due: ["external_account"], past_due: [] },
  }), "PENDING");

  assert.equal(resolveStripeConnectVerificationStatus({
    id: "acct_rejected",
    details_submitted: true,
    payouts_enabled: false,
    requirements: { disabled_reason: "rejected.fraud", currently_due: [], past_due: [] },
  }), "REJECTED");
});

test("builds safe Stripe Connect verification evidence", () => {
  const evidence = buildStripeConnectEvidence({
    id: "acct_123",
    details_submitted: true,
    payouts_enabled: false,
    charges_enabled: true,
    requirements: { currently_due: ["individual.verification.document"], past_due: [] },
  });

  assert.equal(evidence.provider_reference_id, "acct_123");
  assert.equal(evidence.details_submitted, true);
  assert.deepEqual(evidence.requirements.currently_due, ["individual.verification.document"]);
});

test("resolves Stripe Identity verification session status", () => {
  assert.equal(resolveStripeIdentityVerificationStatus({ id: "vs_1", status: "verified" }), "VERIFIED");
  assert.equal(resolveStripeIdentityVerificationStatus({ id: "vs_2", status: "processing" }), "PENDING");
  assert.equal(resolveStripeIdentityVerificationStatus({ id: "vs_3", status: "requires_input" }), "REJECTED");
  assert.equal(resolveStripeIdentityVerificationStatus({ id: "vs_4", status: "canceled" }), "REJECTED");
});

test("resolves portfolio verification from reviewable profile evidence", () => {
  assert.equal(resolvePortfolioVerificationStatus({
    portfolioUrl: "https://example.com/portfolio",
    bio: "Full-stack facilitator for SaaS teams.",
    skills: ["Next.js"],
    aiToolStack: ["Cursor"],
  }), "VERIFIED");

  assert.equal(resolvePortfolioVerificationStatus({
    portfolioUrl: "not-a-url",
    bio: "Full-stack facilitator for SaaS teams.",
    skills: ["Next.js"],
  }), "REJECTED");

  assert.equal(resolvePortfolioVerificationStatus({
    portfolioUrl: "https://example.com/portfolio",
    bio: "",
    skills: ["Next.js"],
  }), "PENDING");
});

test("builds safe portfolio evidence summary", () => {
  const evidence = buildPortfolioEvidence({
    portfolioUrl: "https://example.com/portfolio",
    bio: "Full-stack facilitator.",
    skills: ["React", "Stripe"],
    aiToolStack: ["Cursor"],
  });

  assert.equal(evidence.portfolio_url, "https://example.com/portfolio");
  assert.equal(evidence.has_bio, true);
  assert.equal(evidence.skills_count, 2);
  assert.equal(evidence.ai_tool_count, 1);
});

test("builds verification lifecycle notification copy", () => {
  assert.deepEqual(buildVerificationNotificationCopy({ type: "IDENTITY", status: "VERIFIED" }), {
    type: "SUCCESS",
    message: "Identity verification is verified.",
  });

  assert.deepEqual(buildVerificationNotificationCopy({ type: "STRIPE", status: "REJECTED" }), {
    type: "ERROR",
    message: "Stripe payout verification needs attention before you can win or receive marketplace payouts.",
  });

  assert.deepEqual(buildVerificationNotificationCopy({ type: "PORTFOLIO", status: "PENDING" }), {
    type: "WARNING",
    message: "Portfolio verification is pending review.",
  });
});
