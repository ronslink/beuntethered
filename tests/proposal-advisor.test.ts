import assert from "node:assert/strict";
import test from "node:test";
import { buildProposalAdvisorPacket } from "../src/lib/proposal-advisor.ts";

test("builds a facilitator proposal packet from buyer SOW milestones", () => {
  const packet = buildProposalAdvisorPacket({
    title: "Billing Portal Repair",
    ai_generated_sow: "Repair a Next.js portal with Stripe billing webhooks and release evidence.",
    milestones: [
      {
        title: "Webhook repair",
        description: "Fix Stripe webhook handling and verify idempotent payment records.",
        amount: 2500,
        estimated_duration_days: 4,
        deliverables: ["Repository branch", "Webhook logs"],
        acceptance_criteria: ["Stripe test payment updates escrow state"],
      },
      {
        title: "Buyer review release",
        description: "Deploy a staging portal and provide screenshots for approval.",
        amount: 1500,
        estimated_duration_days: 3,
        deliverables: ["Staging URL", "Release notes"],
        acceptance_criteria: ["Buyer can open the dashboard"],
      },
    ],
    evidence_sources: [
      { type: "VERCEL", status: "CONNECTED", label: "Staging deployment" },
      { type: "NETLIFY", status: "CONNECTED", label: "Frontend deploy preview" },
      { type: "RAILWAY", status: "CONNECTED", label: "Worker service" },
      { type: "RENDER", status: "CONNECTED", label: "Webhook worker" },
      { type: "GITHUB", status: "CONNECTED", label: "Delivery repository" },
    ],
  });

  assert.equal(packet.buyerBudgetTotal, 4000);
  assert.equal(packet.buyerTimelineDays, 7);
  assert.equal(packet.milestoneStrategy.length, 2);
  assert.equal(packet.milestoneStrategy[0].buyerAmount, 2500);
  assert.equal(packet.milestoneStrategy[0].buyerDays, 4);
  assert.ok(packet.evidencePlan.some((item) => /staging url/i.test(item)));
  assert.equal(packet.evidenceConfidence.level, "high");
  assert.ok(packet.evidenceConfidence.hasSystemEvidence);
  assert.ok(packet.evidenceConfidence.strengths.some((item) => /deployment/i.test(item)));
  assert.ok(packet.evidenceConfidence.strengths.some((item) => /deploy preview/i.test(item)));
  assert.ok(packet.evidenceConfidence.strengths.some((item) => /backend service/i.test(item)));
  assert.ok(packet.evidenceConfidence.strengths.some((item) => /managed backend/i.test(item)));
  assert.ok(packet.evidencePlan.some((item) => /webhook/i.test(item)));
  assert.ok(packet.buyerQuestions.some((item) => /payment scenarios/i.test(item)));
  assert.match(packet.positioning, /facilitator-led execution/);
});

test("flags missing pricing and timeline as proposal risks", () => {
  const packet = buildProposalAdvisorPacket({
    title: "Unpriced AI Automation",
    ai_generated_sow: "Create an AI agent workflow.",
    milestones: [],
  });

  assert.equal(packet.buyerBudgetTotal, null);
  assert.equal(packet.buyerTimelineDays, null);
  assert.ok(packet.riskNotes.some((risk) => /price after clarification/i.test(risk)));
  assert.ok(packet.riskNotes.some((risk) => /confirm delivery window before quoting/i.test(risk)));
  assert.ok(packet.riskNotes.some((risk) => /live deployment, PaaS service, repository, or database evidence/i.test(risk)));
  assert.ok(packet.buyerQuestions.some((question) => /model\/provider/i.test(question)));
});
