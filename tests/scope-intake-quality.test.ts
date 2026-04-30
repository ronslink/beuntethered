import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeIntake } from "../src/lib/scope-intake-quality.ts";

test("blocks vague requests that cannot become valid milestones", () => {
  const assessment = assessScopeIntake("Build me something cool");

  assert.equal(assessment.status, "needs_detail");
  assert.ok(assessment.issues.some((issue) => issue.code === "no_software_outcome"));
  assert.ok(assessment.guidingQuestions.some((question) => /website, app, dashboard/.test(question)));
});

test("explains why process-only work is not a standalone deliverable", () => {
  const assessment = assessScopeIntake("Testing and bug fixes");

  assert.equal(assessment.status, "needs_detail");
  assert.ok(assessment.issues.some((issue) => issue.code === "process_only"));
  assert.ok(assessment.guidingQuestions.some((question) => /tangible feature/.test(question)));
  assert.match(
    assessment.issues.find((issue) => issue.code === "process_only")?.why ?? "",
    /standalone escrow milestones/
  );
});

test("warns when a viable software scope is missing delivery constraints", () => {
  const assessment = assessScopeIntake(
    "Build a payroll application for employees and admins with automated tax calculations and payslip generation for US and Canada."
  );

  assert.equal(assessment.status, "ready");
  assert.ok(assessment.issues.some((issue) => issue.code === "missing_constraints"));
  assert.ok(assessment.guidingQuestions.some((question) => /budget, timeline/.test(question)));
  assert.match(assessment.suggestedPrompt, /Constraints include/);
});

test("accepts a clear, verifiable software delivery prompt", () => {
  const assessment = assessScopeIntake(
    "Build a payroll application for employees and admins covering US and Canada with automated tax calculations, payslip generation, admin reporting dashboard, staging demo evidence with screenshots and QA reports, budget $15,000, and target timeline 30 days."
  );

  assert.equal(assessment.status, "ready");
  assert.equal(assessment.issues.length, 0);
  assert.equal(assessment.guidingQuestions.length, 0);
});
