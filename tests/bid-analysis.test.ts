import assert from "node:assert/strict";
import test from "node:test";
import { buildBidScoreCard, parseBidMilestones, summarizeBidScoreCard } from "../src/lib/bid-analysis.ts";

const project = {
  ai_generated_sow: "Build a Next.js client portal with Stripe escrow and audit-backed milestone release.",
  milestones: [
    {
      title: "Portal foundation",
      description: "Next.js dashboard with login and project records.",
      deliverables: ["working dashboard", "database schema"],
      acceptance_criteria: ["Demo runs in staging", "Release evidence report is visible"],
      amount: 4000,
      estimated_duration_days: 7,
    },
    {
      title: "Escrow release",
      description: "Stripe-backed payment release workflow.",
      deliverables: ["checkout", "webhook"],
      acceptance_criteria: ["Funding is idempotent", "Release cannot double pay"],
      amount: 3000,
      estimated_duration_days: 5,
    },
  ],
};

test("scores a stored bid against project scope and milestone evidence", () => {
  const score = buildBidScoreCard({
    project,
    proposedAmount: 7200,
    estimatedDays: 12,
    technicalApproach: "I will ship a Next.js and Stripe implementation with staging demos, audit evidence, and release checks.",
    proposedTechStack: "Next.js, TypeScript, Stripe, Prisma",
    proposedMilestones: [
      { title: "Portal", amount: 4200, days: 7, description: "Demo and acceptance report." },
      { title: "Payments", amount: 3000, days: 5, description: "Webhook tests and audit evidence." },
    ],
    generatedAt: new Date("2026-04-28T12:00:00.000Z"),
  });

  assert.equal(score.price.signal, "FAIR");
  assert.equal(score.timeline.signal, "REALISTIC");
  assert.equal(score.recommendation, "TOP_PICK");
  assert.equal(score.flags.length, 0);
  assert.equal(score.generated_at, "2026-04-28T12:00:00.000Z");
});

test("flags risky bid evidence without relying on caller-supplied scorecard data", () => {
  const score = buildBidScoreCard({
    project,
    proposedAmount: 1500,
    estimatedDays: 30,
    technicalApproach: "Will build it quickly.",
    proposedTechStack: "WordPress, PHP",
    proposedMilestones: [{ title: "Everything", amount: 1500, days: 30, description: "Complete work." }],
  });

  assert.equal(score.price.signal, "OUTLIER");
  assert.equal(score.timeline.signal, "UNREALISTIC");
  assert.equal(score.recommendation, "CAUTION");
  assert.ok(score.flags.length >= 2);
});

test("parses persisted JSON milestone proposals and summarizes scorecards", () => {
  const milestones = parseBidMilestones('[{"title":"Build","amount":1000,"days":3}]');
  assert.equal(milestones?.[0]?.title, "Build");

  const score = buildBidScoreCard({
    project,
    proposedAmount: 7000,
    estimatedDays: 12,
    technicalApproach: "Next.js delivery with demo evidence and release criteria.",
    proposedTechStack: "Next.js, Stripe",
    proposedMilestones: milestones,
  });
  assert.match(summarizeBidScoreCard(score), /Stack compatibility/);
});
