import assert from "node:assert/strict";
import test from "node:test";
import {
  executiveSummaryWithScopeConstraints,
  extractBudgetConstraint,
  extractBudgetAmountConstraint,
  extractCentralComponentConstraints,
  extractRegionConstraints,
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

test("summarizes captured scope constraints for buyer review", () => {
  assert.deepEqual(
    summarizeScopeConstraints({
      regions: ["North America", "Asia", "Middle East"],
      components: ["tax calculations", "payslip generation"],
      budget: "$15,000",
      budgetAmount: 15000,
      timelineDays: 21,
    }),
    [
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
    budget: null,
    budgetAmount: null,
    timelineDays: null,
  });

  assert.match(result, /North America, Asia, Middle East/);
  assert.match(result, /automated tax calculations/);
});
