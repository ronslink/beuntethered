import assert from "node:assert/strict";
import test from "node:test";
import { getMilestoneProofPlan } from "../src/lib/milestone-proof.ts";

test("builds a proof plan for interactive software milestones", () => {
  const plan = getMilestoneProofPlan({
    title: "Billing Portal",
    description: "Build a customer portal with Stripe checkout and invoice history.",
    deliverables: ["Customer billing dashboard", "Stripe checkout flow"],
    acceptance_criteria: [
      "Client can open the billing dashboard and see current subscription state.",
      "Stripe webhook events record successful payment updates.",
    ],
  });

  assert.equal(plan.requiredArtifacts.some((artifact) => artifact.label === "Working preview URL"), true);
  assert.equal(plan.requiredArtifacts.some((artifact) => artifact.label === "Source or package archive"), true);
  assert.equal(plan.reviewChecks.length, 2);
  assert.match(plan.summary, /2 deliverables/);
});

test("marks submitted evidence as available", () => {
  const plan = getMilestoneProofPlan({
    title: "Operations dashboard delivery",
    deliverables: ["Preview deployment", "Source archive", "Evidence note"],
    acceptance_criteria: ["Preview URL loads", "Dashboard workflow is documented"],
    live_preview_url: "https://preview.example.com",
    payload_storage_path: "https://storage.example.com/source.zip",
    attachments: [{ purpose: "MILESTONE_SUBMISSION", name: "evidence.txt" }],
  });

  assert.equal(plan.requiredArtifacts.find((artifact) => artifact.key === "preview")?.available, true);
  assert.equal(plan.requiredArtifacts.find((artifact) => artifact.key === "source")?.available, true);
  assert.equal(plan.requiredArtifacts.find((artifact) => artifact.key === "criteria")?.available, true);
});

test("falls back to artifact review for non-interactive deliverables", () => {
  const plan = getMilestoneProofPlan({
    title: "Architecture Roadmap",
    deliverables: ["Architecture roadmap", "Implementation estimate"],
  });

  assert.equal(plan.requiredArtifacts[0].label, "Reviewable artifact link");
  assert.ok(plan.reviewChecks.some((check) => check.includes("architecture roadmap")));
});
