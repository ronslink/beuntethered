import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketplaceQueryString,
  filterAndSortProjectsForSavedSearch,
  isSavedSearchAlertDue,
  normalizeSavedSearchFilters,
} from "../src/lib/saved-search-alert-rules.ts";

test("normalizes saved search filters", () => {
  const filters = normalizeSavedSearchFilters({
    search: "  agent workflow  ",
    budget: "5K_20K",
    sort: "budget_desc",
  });

  assert.deepEqual(filters, {
    search: "agent workflow",
    budget: "5K_20K",
    sort: "budget_desc",
  });

  assert.equal(normalizeSavedSearchFilters({ sort: "best_match" }).sort, "best_match");
  assert.equal(normalizeSavedSearchFilters({ sort: "unsupported" }).sort, "best_match");
});

test("calculates saved search alert cadence", () => {
  const now = new Date("2026-04-27T12:00:00.000Z");

  assert.equal(isSavedSearchAlertDue({
    enabled: true,
    alertFrequency: "DAILY",
    lastAlertedAt: null,
    now,
  }), true);

  assert.equal(isSavedSearchAlertDue({
    enabled: true,
    alertFrequency: "DAILY",
    lastAlertedAt: new Date("2026-04-27T08:00:00.000Z"),
    now,
  }), false);

  assert.equal(isSavedSearchAlertDue({
    enabled: true,
    alertFrequency: "NEVER",
    lastAlertedAt: null,
    now,
  }), false);
});

test("filters and sorts projects for saved search alerts", () => {
  const filters = normalizeSavedSearchFilters({ search: "ai", budget: "5K_20K", sort: "budget_desc" });
  const projects = [
    {
      id: "low",
      title: "AI analytics tune-up",
      ai_generated_sow: "Improve reporting",
      created_at: new Date("2026-04-27T10:00:00.000Z"),
      milestones: [{ amount: 3000 }],
      _count: { bids: 1 },
    },
    {
      id: "match",
      title: "AI support agent",
      ai_generated_sow: "Build intake workflows",
      created_at: new Date("2026-04-27T11:00:00.000Z"),
      milestones: [{ amount: 8000 }, { amount: 4000 }],
      _count: { bids: 3 },
    },
    {
      id: "higher",
      title: "AI platform refactor",
      ai_generated_sow: "Modernize app",
      created_at: new Date("2026-04-27T09:00:00.000Z"),
      milestones: [{ amount: 18000 }],
      _count: { bids: 2 },
    },
  ];

  const matching = filterAndSortProjectsForSavedSearch(projects, filters);

  assert.deepEqual(matching.map((project) => project.id), ["higher", "match"]);
});

test("builds marketplace query strings for saved searches", () => {
  const filters = normalizeSavedSearchFilters({ search: "ai agent", budget: "OVER_20K", sort: "most_bidding" });

  assert.equal(buildMarketplaceQueryString(filters), "search=ai+agent&budget=OVER_20K&sort=most_bidding");
  assert.equal(buildMarketplaceQueryString(normalizeSavedSearchFilters({ search: "stripe", sort: "best_match" })), "search=stripe");
});
