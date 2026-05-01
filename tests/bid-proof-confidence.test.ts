import assert from "node:assert/strict";
import test from "node:test";
import { getBidProofConfidence } from "../src/lib/bid-proof-confidence.ts";

test("scores provider-backed proposals above screenshot-only evidence", () => {
  const providerBacked = getBidProofConfidence({
    technicalApproach: "I will ship via GitHub pull requests, Vercel preview deployments, and an audit report for each release.",
    proposedMilestones: [
      {
        title: "Portal release",
        description: "Working staging URL with release report.",
        deliverables: ["Vercel preview URL", "GitHub pull request"],
        acceptance_criteria: ["Client can complete the main workflow"],
      },
    ],
    facilitatorProofScore: 84,
    facilitatorProofLevel: "trusted",
    connectedEvidenceProviderLabels: ["GitHub", "Vercel"],
    connectedEvidenceSourceCount: 2,
  });

  const screenshotOnly = getBidProofConfidence({
    technicalApproach: "I will send screenshots when complete.",
    proposedMilestones: [{ title: "Build", description: "Build the app." }],
    facilitatorProofScore: 42,
    facilitatorProofLevel: "verified",
    connectedEvidenceProviderLabels: [],
  });

  assert.ok(providerBacked.score > screenshotOnly.score);
  assert.equal(providerBacked.level, "audit_ready");
  assert.ok(providerBacked.detectedEvidenceProviders.includes("GitHub"));
  assert.ok(screenshotOnly.gaps.some((gap) => gap.includes("provider-backed proof")));
});

test("keeps proof risks visible when AI flags evidence gaps", () => {
  const confidence = getBidProofConfidence({
    technicalApproach: "I can handle the project and refine details later.",
    proposedMilestones: [{ title: "Delivery", description: "Finish the requested system." }],
    aiFlags: ["No clear acceptance evidence described."],
    facilitatorProofScore: 68,
    facilitatorProofLevel: "verified",
  });

  assert.ok(confidence.score < 68);
  assert.ok(confidence.gaps.some((gap) => gap.includes("AI bid review")));
});

test("supports proposal composer scoring without facilitator readiness penalties", () => {
  const confidence = getBidProofConfidence({
    technicalApproach:
      "I will deliver through GitHub pull requests, Vercel previews, migration logs, and a release report for each milestone.",
    proposedMilestones: [
      {
        title: "Verified release",
        description: "Ship the workflow with reviewable deployment and repository evidence.",
        deliverables: ["GitHub pull request", "Vercel preview URL"],
        acceptance_criteria: ["Buyer can review the deployed workflow before release"],
      },
    ],
    connectedEvidenceSourceCount: 2,
    connectedEvidenceContext: "project",
    includeFacilitatorReadiness: false,
  });

  assert.ok(confidence.score > 50);
  assert.ok(confidence.strengths.some((strength) => strength.includes("Project has connected evidence sources")));
  assert.ok(!confidence.gaps.some((gap) => gap.includes("Facilitator proof readiness")));
});
