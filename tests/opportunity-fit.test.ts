import assert from "node:assert/strict";
import test from "node:test";
import {
  computeOpportunityFit,
  inferOpportunityEvidenceNeeds,
  inferOpportunityTerms,
  uniqueOpportunityTerms,
} from "../src/lib/opportunity-fit.ts";

test("normalizes opportunity terms for skill matching", () => {
  assert.deepEqual(uniqueOpportunityTerms("Next.js + TypeScript dashboard"), ["next", "typescript", "dashboard"]);
});

test("infers proof evidence needs from verifiable delivery language", () => {
  const needs = inferOpportunityEvidenceNeeds({
    title: "Launch-ready customer portal",
    ai_generated_sow:
      "Ship a Vercel preview, Supabase migration evidence, GitHub pull request, and DNS launch proof.",
  });

  assert.deepEqual(needs.slice(0, 4), ["GITHUB", "VERCEL", "NETLIFY", "CLOUDFLARE"]);
  assert.equal(needs.includes("SUPABASE"), true);
  assert.equal(needs.includes("DOMAIN"), true);
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
    ai_generated_sow: "Create a Next.js dashboard with Stripe billing, GitHub pull requests, and automation.",
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
    proof_capabilities: ["GITHUB", "VERCEL", "SUPABASE"],
  };

  const fit = computeOpportunityFit(project, profile);

  assert.equal(fit.score, 98);
  assert.deepEqual(fit.matchedTerms.slice(0, 4), ["react", "next", "stripe", "postgres"]);
  assert.deepEqual(fit.matchedProofCapabilities.slice(0, 2), ["GITHUB", "VERCEL"]);
  assert.equal(fit.reasons.some((reason) => reason.includes("Proof fit")), true);
  assert.equal(fit.reasons.includes("Client invited you"), true);
});

test("raises fit when declared proof capabilities match project evidence needs", () => {
  const project = {
    title: "Operations dashboard launch",
    ai_generated_sow: "Build a dashboard with Vercel preview, Supabase migration, and domain launch evidence.",
  };
  const baseProfile = {
    skills: ["Operations"],
    ai_agent_stack: ["Cursor"],
    trust_score: 58,
    average_ai_audit_score: 0,
    total_sprints_completed: 0,
    platform_tier: "STANDARD",
    availability: "AVAILABLE",
    portfolio_url: "https://example.com",
  };

  const withoutProof = computeOpportunityFit(project, baseProfile);
  const withProof = computeOpportunityFit(project, {
    ...baseProfile,
    proof_capabilities: ["VERCEL", "SUPABASE", "DOMAIN"],
  });

  assert.ok(withProof.score > withoutProof.score);
  assert.deepEqual(withProof.matchedProofCapabilities, ["VERCEL", "SUPABASE", "DOMAIN"]);
  assert.equal(withProof.source, "profile-proof-fit");
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
