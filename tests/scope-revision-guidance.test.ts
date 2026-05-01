import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScopeRevisionGuidance,
  isScopeRevisionHelpRequest,
} from "../src/lib/scope-revision-guidance.ts";

test("detects help requests that should not trigger SOW regeneration", () => {
  assert.equal(isScopeRevisionHelpRequest("what do I need to change?"), true);
  assert.equal(isScopeRevisionHelpRequest("How should I fix this"), true);
  assert.equal(isScopeRevisionHelpRequest("Keep the budget but split compliance into its own milestone."), false);
});

test("builds actionable revision guidance from quality and constraint signals", () => {
  const result = buildScopeRevisionGuidance({
    milestoneIssues: [
      {
        title: "Testing",
        issue: "Milestone title is process-only",
        guidance: "Name the buyer-visible result instead of the activity.",
      },
    ],
    feasibilityStatus: "unrealistic",
    feasibilityNextSteps: ["Extend the timeline toward 42 days, or split the idea into discovery plus execution."],
    leanScopeOptions: ["Launch one region first, then add Asia after evidence is verified."],
    budgetAmount: 15000,
    timelineDays: 21,
  });

  assert.ok(result.guidance.some((item) => /Extend the timeline/.test(item)));
  assert.ok(result.guidance.some((item) => /Testing/.test(item)));
  assert.match(result.suggestedRevision, /Revise the SOW/);
  assert.match(result.suggestedRevision, /\$15,000/);
  assert.match(result.suggestedRevision, /21 days/);
});
