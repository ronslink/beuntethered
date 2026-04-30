import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeFeasibility } from "../src/lib/scope-feasibility.ts";
import { assessScopeIntake } from "../src/lib/scope-intake-quality.ts";
import {
  PROJECT_PROBLEM_STARTERS,
  PROJECT_SCOPE_STARTERS,
  buildStarterPrompt,
} from "../src/lib/project-scope-starters.ts";

test("project starters are unique and buyer editable", () => {
  const labels = PROJECT_SCOPE_STARTERS.map((starter) => starter.label);

  assert.equal(labels.length, new Set(labels).size);
  assert.ok(PROJECT_SCOPE_STARTERS.length >= 6);
  assert.ok(PROJECT_SCOPE_STARTERS.every((starter) => starter.prompt.length > 120));
});

test("project starters frame familiar scopes without implying price or timeline", () => {
  for (const starter of PROJECT_SCOPE_STARTERS) {
    const prompt = buildStarterPrompt(starter);
    const intake = assessScopeIntake(prompt);
    const feasibility = assessScopeFeasibility({
      prompt,
      budgetAmount: null,
      timelineDays: null,
    });

    assert.equal(prompt, starter.prompt, `${starter.label} should not append price or timeline copy`);
    assert.equal(intake.status, "ready", `${starter.label} should be a usable scope frame`);
    assert.ok(!intake.issues.some((issue) => issue.severity === "blocker"), `${starter.label} should not start blocked`);
    assert.ok(intake.issues.some((issue) => issue.code === "missing_constraints"), `${starter.label} should ask for buyer constraints`);
    assert.equal(feasibility.status, "missing", `${starter.label} should wait for buyer constraints`);
    assert.equal(feasibility.canPostExecution, false, `${starter.label} should not be postable without constraints`);
  }
});

test("problem starters frame business problems without implying price or timeline", () => {
  assert.ok(PROJECT_PROBLEM_STARTERS.length >= 3);

  const labels = PROJECT_PROBLEM_STARTERS.map((starter) => starter.label);
  assert.deepEqual(labels, ["Manual Workflow", "System Connection", "Self-Service Workflow"]);
  assert.ok(PROJECT_PROBLEM_STARTERS.every((starter) => !/quickbooks|xero|hubspot|salesforce/i.test(starter.problem)));

  for (const starter of PROJECT_PROBLEM_STARTERS) {
    const prompt = starter.prompt;
    const intake = assessScopeIntake(prompt);
    const feasibility = assessScopeFeasibility({
      prompt,
      budgetAmount: null,
      timelineDays: null,
    });

    assert.ok(starter.problem.length > 80, `${starter.label} should describe the buyer problem`);
    assert.equal(intake.status, "ready", `${starter.label} should become a usable problem frame`);
    assert.ok(!intake.issues.some((issue) => issue.severity === "blocker"), `${starter.label} should not start blocked`);
    assert.ok(intake.issues.some((issue) => issue.code === "missing_constraints"), `${starter.label} should ask for buyer constraints`);
    assert.notEqual(intake.problemPattern?.id, "payment_accounting_sync", `${starter.label} should not imply accounting too early`);
    assert.notEqual(intake.problemPattern?.id, "reporting_automation", `${starter.label} should not imply reporting too early`);
    assert.equal(feasibility.status, "missing", `${starter.label} should wait for buyer constraints`);
    assert.equal(feasibility.canPostExecution, false, `${starter.label} should not be postable without constraints`);
  }
});
