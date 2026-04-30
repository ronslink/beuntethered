import assert from "node:assert/strict";
import test from "node:test";
import {
  assessBidSelfDealingRisk,
  assessProjectScopeRisk,
  hashRiskValue,
  requestRiskFingerprintFromHeaders,
  scopeSimilarity,
} from "../src/lib/account-risk.ts";

test("request risk fingerprint hashes IP and user agent instead of exposing raw values", () => {
  const headers = new Map([
    ["x-forwarded-for", "203.0.113.10, 10.0.0.1"],
    ["user-agent", "Playwright Test Browser"],
  ]);

  const fingerprint = requestRiskFingerprintFromHeaders({
    get: (name) => headers.get(name) ?? null,
  });

  assert.equal(fingerprint.hashedIp, hashRiskValue("203.0.113.10"));
  assert.equal(fingerprint.userAgentHash, hashRiskValue("Playwright Test Browser"));
  assert.notEqual(fingerprint.hashedIp, "203.0.113.10");
});

test("scope similarity allows genuine duplicate ideas without linked signals", () => {
  const risk = assessProjectScopeRisk({
    userId: "client_new",
    title: "Customer analytics dashboard",
    aiGeneratedSow: "Create a customer analytics dashboard with reporting, filters, and exportable charts.",
    fingerprint: { hashedIp: hashRiskValue("198.51.100.4"), userAgentHash: hashRiskValue("browser-a") },
    candidates: [
      {
        id: "existing_project",
        creator_id: "client_other",
        organization_id: "org_other",
        title: "Customer analytics dashboard",
        ai_generated_sow: "Create a customer analytics dashboard with reporting, filters, and exportable charts.",
        account_risk_signals: [{ hashed_ip: hashRiskValue("203.0.113.8"), user_agent_hash: hashRiskValue("browser-b") }],
      },
    ],
  });

  assert.equal(risk.severity, "INFO");
  assert.equal(risk.matchedProjectId, "existing_project");
  assert.ok(risk.similarity > 0.85);
});

test("scope similarity flags linked duplicate posting for review", () => {
  const hashedIp = hashRiskValue("198.51.100.7");
  const userAgentHash = hashRiskValue("same-browser");
  const risk = assessProjectScopeRisk({
    userId: "client_new",
    organizationId: "org_shared",
    title: "Vendor portal with Stripe checkout",
    aiGeneratedSow: "Build a vendor portal with Stripe checkout, admin reporting, and audit-ready milestones.",
    fingerprint: { hashedIp, userAgentHash },
    candidates: [
      {
        id: "existing_project",
        creator_id: "client_other",
        organization_id: "org_shared",
        title: "Vendor portal with Stripe checkout",
        ai_generated_sow: "Build a vendor portal with Stripe checkout, admin reporting, and audit-ready milestones.",
        account_risk_signals: [{ hashed_ip: hashedIp, user_agent_hash: userAgentHash }],
      },
    ],
  });

  assert.equal(risk.severity, "REVIEW");
  assert.deepEqual(risk.linkedSignals.sort(), ["same_hashed_ip", "same_organization", "same_user_agent_hash"].sort());
});

test("bid self-dealing review requires more than a shared IP when not the same account", () => {
  const hashedIp = hashRiskValue("198.51.100.9");

  const weak = assessBidSelfDealingRisk({
    bidderId: "facilitator_1",
    projectCreatorId: "client_1",
    projectClientId: "client_1",
    fingerprint: { hashedIp, userAgentHash: hashRiskValue("browser-facilitator") },
    projectPostingSignals: [{ hashed_ip: hashedIp, user_agent_hash: hashRiskValue("browser-client") }],
  });
  assert.equal(weak.severity, "INFO");

  const review = assessBidSelfDealingRisk({
    bidderId: "facilitator_1",
    projectCreatorId: "client_1",
    projectClientId: "client_1",
    fingerprint: { hashedIp, userAgentHash: hashRiskValue("same-browser") },
    projectPostingSignals: [{ hashed_ip: hashedIp, user_agent_hash: hashRiskValue("same-browser") }],
  });
  assert.equal(review.severity, "REVIEW");
});

test("scope similarity gives strong overlap for copied operational scopes", () => {
  assert.ok(
    scopeSimilarity(
      "Build an operations dashboard with login, reporting, and Stripe billing",
      "Operations dashboard login reporting Stripe billing"
    ) > 0.7
  );
});
