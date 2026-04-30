import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeFeasibility } from "../src/lib/scope-feasibility.ts";

const payrollPrompt =
  "Multi-region payroll application covering North America, Middle East, and Asia with automated tax calculations, payslip generation, AI chatbot for employee inquiries, and admin reporting dashboard.";

test("requires explicit budget and timeline fields", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: null,
    timelineDays: null,
  });

  assert.equal(assessment.status, "missing");
  assert.equal(assessment.label, "Budget Needed");
  assert.equal(assessment.canPostExecution, false);
  assert.match(assessment.reasons[0], /required/);
});

test("flags complex scopes that are unrealistic against market budget or timeline", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: 3000,
    timelineDays: 7,
  });

  assert.equal(assessment.status, "unrealistic");
  assert.equal(assessment.label, "Unrealistic constraints");
  assert.equal(assessment.canPostExecution, false);
  assert.ok(assessment.estimatedMarketBudget && assessment.estimatedMarketBudget > 3000);
  assert.ok(assessment.estimatedMarketDays && assessment.estimatedMarketDays > 7);
  assert.ok(assessment.recommendedBudget && assessment.recommendedBudget >= assessment.estimatedMarketBudget);
  assert.ok(assessment.recommendedTimelineDays && assessment.recommendedTimelineDays >= assessment.estimatedMarketDays);
  assert.ok(assessment.phasedScopePrompt?.includes("phased first release"));
  assert.ok(assessment.nextSteps.some((step) => /Raise the budget|Extend the timeline/.test(step)));
});

test("allows aggressive scopes with warnings", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: 35000,
    timelineDays: 75,
  });

  assert.equal(assessment.status, "aggressive");
  assert.equal(assessment.label, "Aggressive constraints");
  assert.equal(assessment.canPostExecution, true);
});

test("accepts realistic budget and timeline ranges", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: 45000,
    timelineDays: 90,
  });

  assert.equal(assessment.status, "market_ready");
  assert.equal(assessment.label, "Market-ready");
  assert.equal(assessment.canPostExecution, true);
  assert.ok(assessment.reasons.some((reason) => /reasonable planning range/.test(reason)));
  assert.ok(assessment.nextSteps.some((step) => /Generate the SOW/.test(step)));
});

test("adds target complexity to market timeline when major deliverables are requested", () => {
  const basic = assessScopeFeasibility({
    prompt: "Build a payroll application with employee records.",
    budgetAmount: 20000,
    timelineDays: 45,
  });
  const withDashboard = assessScopeFeasibility({
    prompt: "Build a payroll application with employee records and an admin dashboard outside of the application.",
    budgetAmount: 20000,
    timelineDays: 45,
  });

  assert.ok(withDashboard.estimatedMarketDays && basic.estimatedMarketDays);
  assert.ok(withDashboard.estimatedMarketDays > basic.estimatedMarketDays);
  assert.ok(withDashboard.estimatedMarketBudget && basic.estimatedMarketBudget);
  assert.ok(withDashboard.estimatedMarketBudget > basic.estimatedMarketBudget);
});
