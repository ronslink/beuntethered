import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeFeasibility } from "../src/lib/scope-feasibility.ts";

const payrollPrompt =
  "Multi-country payroll application covering US, Canada, UAE, and Philippines with automated tax calculations, payslip generation, AI chatbot for employee inquiries, and admin reporting dashboard.";

test("requires explicit budget and timeline fields", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: null,
    timelineDays: null,
  });

  assert.equal(assessment.status, "missing");
  assert.match(assessment.reasons[0], /required/);
});

test("flags complex scopes that are under market budget or timeline", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: 3000,
    timelineDays: 7,
  });

  assert.equal(assessment.status, "underfunded");
  assert.ok(assessment.estimatedMarketBudget && assessment.estimatedMarketBudget > 3000);
  assert.ok(assessment.estimatedMarketDays && assessment.estimatedMarketDays > 7);
});

test("accepts realistic budget and timeline ranges", () => {
  const assessment = assessScopeFeasibility({
    prompt: payrollPrompt,
    budgetAmount: 30000,
    timelineDays: 60,
  });

  assert.equal(assessment.status, "realistic");
  assert.ok(assessment.reasons.some((reason) => /reasonable planning range/.test(reason)));
});
