import assert from "node:assert/strict";
import test from "node:test";
import {
  executiveSummaryWithScopeConstraints,
  extractBudgetConstraint,
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
});

test("summarizes captured scope constraints for buyer review", () => {
  assert.deepEqual(
    summarizeScopeConstraints({
      regions: ["North America", "Asia", "Middle East"],
      budget: "$15,000",
      timelineDays: 21,
    }),
    ["Markets: North America, Asia, Middle East", "Budget: $15,000", "Timeline: 21 days"]
  );
});

test("appends missing regions to executive summaries", () => {
  const result = executiveSummaryWithScopeConstraints("Build a payroll app.", {
    regions: ["North America", "Asia", "Middle East"],
    budget: null,
    timelineDays: null,
  });

  assert.match(result, /North America, Asia, Middle East/);
});
