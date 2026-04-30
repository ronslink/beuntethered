import assert from "node:assert/strict";
import test from "node:test";
import { getBYOCTransitionBaseline, readSowLine } from "../src/lib/byoc-transition.ts";

test("reads transition baseline fields from a BYOC SOW", () => {
  const sow = [
    "Private BYOC Scope: Operations Repair",
    "",
    "BYOC Transition Baseline",
    "Transition mode: running project",
    "Current project state: Staging app exists with failing webhook tests.",
    "Prior work or existing assets: Existing repository and staging deployment.",
    "Remaining work to govern in Untether: Repair webhook flow and produce release evidence.",
    "Known risks or open questions: Buyer still needs to grant repo access.",
  ].join("\n");

  assert.equal(readSowLine(sow, "Transition mode"), "running project");
  assert.deepEqual(getBYOCTransitionBaseline(sow), {
    transitionMode: "running project",
    currentState: "Staging app exists with failing webhook tests.",
    priorWork: "Existing repository and staging deployment.",
    remainingWork: "Repair webhook flow and produce release evidence.",
    knownRisks: "Buyer still needs to grant repo access.",
  });
});

test("does not report a baseline when a regular SOW lacks transition fields", () => {
  assert.equal(getBYOCTransitionBaseline("Build a dashboard with evidence-based milestones."), null);
});

test("keeps a conservative mode default when only partial baseline evidence exists", () => {
  assert.deepEqual(getBYOCTransitionBaseline("Current project state: Discovery call completed."), {
    transitionMode: "new external project",
    currentState: "Discovery call completed.",
    priorWork: null,
    remainingWork: null,
    knownRisks: null,
  });
});
