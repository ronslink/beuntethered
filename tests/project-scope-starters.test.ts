import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeFeasibility } from "../src/lib/scope-feasibility.ts";
import { assessScopeIntake } from "../src/lib/scope-intake-quality.ts";
import { buildStarterPrompt, PROJECT_SCOPE_STARTERS } from "../src/lib/project-scope-starters.ts";

test("project starters are unique and buyer editable", () => {
  const labels = PROJECT_SCOPE_STARTERS.map((starter) => starter.label);

  assert.equal(labels.length, new Set(labels).size);
  assert.ok(PROJECT_SCOPE_STARTERS.length >= 6);
  assert.ok(PROJECT_SCOPE_STARTERS.every((starter) => starter.prompt.length > 120));
});

test("project starters pass intake and feasibility checks", () => {
  for (const starter of PROJECT_SCOPE_STARTERS) {
    const prompt = buildStarterPrompt(starter);
    const intake = assessScopeIntake(prompt);
    const feasibility = assessScopeFeasibility({
      prompt,
      budgetAmount: starter.budget,
      timelineDays: starter.days,
    });

    assert.equal(intake.status, "ready", `${starter.label} should be intake-ready`);
    assert.equal(intake.issues.length, 0, `${starter.label} should not need extra buyer detail`);
    assert.notEqual(feasibility.status, "unrealistic", `${starter.label} should not start blocked`);
    assert.equal(feasibility.canPostExecution, true, `${starter.label} should be postable after review`);
  }
});
