import assert from "node:assert/strict";
import test from "node:test";
import {
  executiveSummaryWithScopeConstraints,
  extractBudgetConstraint,
  extractBudgetAmountConstraint,
  extractCentralComponentConstraints,
  extractProjectTargets,
  extractRegionConstraints,
  estimateProjectTargets,
  ensureSowPreservesScopeConstraints,
  summarizeScopeConstraints,
} from "../src/lib/scope-constraints.ts";

test("extracts named market regions in client input order", () => {
  assert.deepEqual(
    extractRegionConstraints("Build a global payroll system for North America, Asia and Middle East."),
    ["North America", "Asia", "Middle East"]
  );
});

test("extracts named country markets in client input order", () => {
  assert.deepEqual(
    extractRegionConstraints("Payroll application covering US, Canada, UAE, and Philippines."),
    ["US", "Canada", "UAE", "Philippines"]
  );
});

test("does not treat lowercase us as a market", () => {
  assert.deepEqual(
    extractRegionConstraints("Build us a payroll application for Canada."),
    ["Canada"]
  );
});

test("extracts compact budget constraints", () => {
  assert.equal(
    extractBudgetConstraint("I have a budget of 15000 to build this."),
    "$15,000"
  );
  assert.equal(
    extractBudgetAmountConstraint("I have a budget of 15000 to build this."),
    15000
  );
});

test("extracts central component constraints from feature lists", () => {
  assert.deepEqual(
    extractCentralComponentConstraints(
      "Multi-country payroll application covering US, Canada, UAE, and Philippines with automated tax calculations, payslip generation, AI chatbot for employee inquiries, and admin reporting dashboard. Built for launch-readiness."
    ),
    [
      "automated tax calculations",
      "payslip generation",
      "AI chatbot for employee inquiries",
      "admin reporting dashboard",
    ]
  );
});

test("extracts common software delivery targets", () => {
  assert.deepEqual(
    extractProjectTargets("Build both iOS and Android app with an admin dashboard and Stripe API integration."),
    ["iOS and Android app", "Admin dashboard", "API integration"]
  );
});

test("extracts broader marketplace project targets", () => {
  assert.deepEqual(
    extractProjectTargets("Create a SaaS MVP with a client portal, Stripe billing, an AI chatbot, and data migration from Airtable."),
    ["SaaS MVP", "Portal", "Payment or billing system", "AI chatbot or agent", "Data migration", "No-code or low-code rebuild"]
  );
});

test("extracts commerce and operations project targets", () => {
  assert.deepEqual(
    extractProjectTargets("Build an e-commerce store with inventory management, appointment booking, and a CMS blog."),
    ["E-commerce store", "Inventory or order management", "Booking system", "CMS content site"]
  );
});

test("estimates common targets as timeline and budget drivers", () => {
  const estimate = estimateProjectTargets(["PWA", "Admin dashboard"]);

  assert.ok(estimate.budget >= 15000);
  assert.ok(estimate.days >= 50);
});

test("estimates larger marketplace-style targets conservatively", () => {
  const estimate = estimateProjectTargets(["Marketplace app", "Payment or billing system", "Security or compliance hardening"]);

  assert.ok(estimate.budget >= 30000);
  assert.ok(estimate.days >= 100);
});

test("summarizes captured scope constraints for buyer review", () => {
  assert.deepEqual(
    summarizeScopeConstraints({
      regions: ["North America", "Asia", "Middle East"],
      targets: ["PWA", "Admin dashboard"],
      components: ["tax calculations", "payslip generation"],
      budget: "$15,000",
      budgetAmount: 15000,
      timelineDays: 21,
    }),
    [
      "Targets: PWA, Admin dashboard",
      "Markets: North America, Asia, Middle East",
      "Components: tax calculations, payslip generation",
      "Budget: $15,000",
      "Timeline: 21 days",
    ]
  );
});

test("appends missing regions to executive summaries", () => {
  const result = executiveSummaryWithScopeConstraints("Build a payroll app.", {
    regions: ["North America", "Asia", "Middle East"],
    components: ["automated tax calculations"],
    budget: "$15,000",
    budgetAmount: 15000,
    timelineDays: 30,
  });

  assert.match(result, /North America, Asia, Middle East/);
  assert.match(result, /automated tax calculations/);
  assert.match(result, /\$15,000/);
  assert.match(result, /30 days/);
});

test("removes unsupported country substitutions from constrained summaries", () => {
  const result = executiveSummaryWithScopeConstraints(
    "Multi-country payroll application covering US, Canada, UAE, and Philippines with compliance features.",
    {
      regions: ["North America", "Middle East", "Asia"],
      components: ["automated tax calculations", "payslip generation", "AI chatbot for employee inquiries"],
      budget: "$15,000",
      budgetAmount: 15000,
      timelineDays: 30,
    }
  );

  assert.doesNotMatch(result, /\bUS\b|Canada|UAE|Philippines/);
  assert.match(result, /North America, Middle East, Asia/);
  assert.match(result, /automated tax calculations/);
});

test("adds missing required components to verifiable milestone evidence", () => {
  const sow = ensureSowPreservesScopeConstraints(
    {
      executiveSummary: "Build the payroll application.",
      milestones: [
        {
          title: "Payroll Foundation",
          description: "Create the payroll foundation for buyer review.",
          deliverables: ["Payroll account setup flow"],
          acceptance_criteria: "Client can review the payroll account setup flow in a working preview.",
          estimated_duration_days: 10,
          amount: 5000,
        },
      ],
    },
    {
      regions: ["North America", "Middle East", "Asia"],
      targets: ["Admin dashboard"],
      components: ["automated tax calculations", "payslip generation"],
      budget: "$15,000",
      budgetAmount: 15000,
      timelineDays: 30,
    }
  );

  const serializedMilestones = JSON.stringify(sow.milestones);
  assert.match(serializedMilestones, /automated tax calculations/);
  assert.match(serializedMilestones, /payslip generation/);
  assert.match(serializedMilestones, /evidence package|handoff artifact/);
});
