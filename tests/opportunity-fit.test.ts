import assert from "node:assert/strict";
import test from "node:test";
import {
  computeOpportunityFit,
  inferOpportunityTerms,
  uniqueOpportunityTerms,
} from "../src/lib/opportunity-fit.ts";

test("normalizes opportunity terms for skill matching", () => {
  assert.deepEqual(uniqueOpportunityTerms("Next.js + TypeScript dashboard"), ["next", "typescript", "dashboard"]);
});

test("infers delivery terms from project scope and milestone evidence", () => {
  const terms = inferOpportunityTerms({
    title: "Client portal rebuild",
    ai_generated_sow: "Build authenticated checkout and subscription flows.",
    milestones: [
      {
        title: "Payment integration",
        description: "Wire Stripe escrow checkout.",
        deliverables: ["Next.js app", "Postgres tables"],
        acceptance_criteria: ["Client can fund a milestone"],
      },
    ],
  });

  assert.equal(terms.has("stripe"), true);
  assert.equal(terms.has("react"), true);
  assert.equal(terms.has("postgres"), true);
});

test("scores facilitator opportunity fit using skills, trust signals, and invites", () => {
  const project = {
    title: "AI support portal",
    ai_generated_sow: "Create a Next.js dashboard with Stripe billing and automation.",
    milestones: [{ title: "Dashboard", description: "Frontend and API workflows" }],
    invites: [{ id: "invite_1" }],
  };
  const profile = {
    skills: ["React", "Next.js", "Stripe", "Postgres"],
    ai_agent_stack: ["OpenAI", "TypeScript"],
    trust_score: 86,
    average_ai_audit_score: 92,
    total_sprints_completed: 8,
    platform_tier: "ELITE",
    availability: "Available this week",
    portfolio_url: "https://example.com",
  };

  const fit = computeOpportunityFit(project, profile);

  assert.equal(fit.score, 98);
  assert.deepEqual(fit.matchedTerms.slice(0, 4), ["react", "next", "stripe", "postgres"]);
  assert.equal(fit.reasons.includes("Client invited you"), true);
});

test("keeps a conservative baseline when profile data is incomplete", () => {
  const fit = computeOpportunityFit({
    title: "Backend API cleanup",
    ai_generated_sow: "Refactor authentication routes.",
  }, null);

  assert.equal(fit.score, 52);
  assert.deepEqual(fit.matchedTerms, []);
  assert.equal(fit.reasons.includes("Trust score not established"), true);
});
