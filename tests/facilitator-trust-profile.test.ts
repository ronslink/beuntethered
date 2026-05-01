import assert from "node:assert/strict";
import test from "node:test";
import { getFacilitatorTrustProfile } from "../src/lib/facilitator-trust-profile.ts";

test("scores an evidence-backed facilitator as enterprise ready", () => {
  const profile = getFacilitatorTrustProfile({
    stripeVerified: true,
    identityVerified: true,
    portfolioVerified: true,
    profileComplete: true,
    completedMilestones: 7,
    averageAuditScore: 92,
    disputeCount: 0,
    aiAgentStackCount: 3,
    skillsCount: 6,
    availability: "AVAILABLE",
    connectedEvidenceSourceCount: 3,
    evidenceProviderTypes: ["GITHUB", "VERCEL", "SUPABASE"],
  });

  assert.equal(profile.proofLevel, "enterprise_ready");
  assert.equal(profile.proofLabel, "Enterprise ready");
  assert.ok(profile.proofScore >= 82);
  assert.deepEqual(profile.evidenceProviderLabels, ["GitHub", "Vercel", "Supabase"]);
  assert.ok(profile.buyerSignals.every((signal) => signal.status === "ready"));
});

test("surfaces missing verification and evidence gaps for emerging facilitators", () => {
  const profile = getFacilitatorTrustProfile({
    stripeVerified: false,
    identityVerified: false,
    profileComplete: false,
    completedMilestones: 0,
    averageAuditScore: 0,
    disputeCount: 0,
    aiAgentStackCount: 0,
    skillsCount: 0,
    connectedEvidenceSourceCount: 0,
  });

  assert.equal(profile.proofLevel, "emerging");
  assert.ok(profile.proofScore < 45);
  assert.ok(profile.gaps.some((gap) => gap.includes("Identity verification")));
  assert.ok(profile.buyerSignals.some((signal) => signal.key === "evidence" && signal.status === "pending"));
});

test("keeps dispute records visible as buyer attention items", () => {
  const profile = getFacilitatorTrustProfile({
    stripeVerified: true,
    identityVerified: true,
    profileComplete: true,
    completedMilestones: 3,
    averageAuditScore: 85,
    disputeCount: 2,
    aiAgentStackCount: 2,
    skillsCount: 3,
    connectedEvidenceSourceCount: 1,
    evidenceProviderTypes: ["RAILWAY"],
  });

  assert.ok(profile.proofScore < 82);
  assert.ok(profile.buyerSignals.some((signal) => signal.key === "disputes" && signal.status === "attention"));
  assert.ok(profile.gaps.some((gap) => gap.includes("2 dispute records")));
});
