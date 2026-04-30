import assert from "node:assert/strict";
import test from "node:test";
import {
  createSowGenerationCacheKey,
  getCachedSowGeneration,
  setCachedSowGeneration,
} from "../src/lib/sow-generation-cache.ts";

test("normalizes equivalent SOW generation requests to the same cache key", () => {
  const first = createSowGenerationCacheKey({
    userId: "user_1",
    prompt: "Multi-country payroll application covering US, Canada, UAE, and Philippines.",
    mode: "EXECUTION",
    desiredTimeline: " 30 days ",
    category: "software_mvp",
    complexity: "complex",
    conversationHistory: "",
  });
  const second = createSowGenerationCacheKey({
    userId: "user_1",
    prompt: "multi-country   payroll application covering us, canada, uae, and philippines.",
    mode: "execution",
    desiredTimeline: "30 days",
    category: "software_mvp",
    complexity: "complex",
    conversationHistory: "",
  });

  assert.equal(first, second);
});

test("uses revision history in the SOW cache key", () => {
  const base = createSowGenerationCacheKey({
    userId: "user_1",
    prompt: "Build payroll",
    mode: "EXECUTION",
    desiredTimeline: "30 days",
    category: "software_mvp",
    complexity: "complex",
  });
  const revised = createSowGenerationCacheKey({
    userId: "user_1",
    prompt: "Build payroll",
    mode: "EXECUTION",
    desiredTimeline: "30 days",
    category: "software_mvp",
    complexity: "complex",
    conversationHistory: "Client revision instruction: make compliance its own milestone",
  });

  assert.notEqual(base, revised);
});

test("returns the exact cached SOW object for repeated generation requests", () => {
  const key = createSowGenerationCacheKey({
    userId: "user_2",
    prompt: "Payroll application covering US and Canada.",
    mode: "EXECUTION",
    desiredTimeline: "",
    category: "software_mvp",
    complexity: "medium",
  });
  const sow = {
    title: "Payroll Platform",
    milestones: [{ title: "Payroll Rules", deliverables: ["Tax calculation flow"] }],
  };

  setCachedSowGeneration(key, sow);

  assert.equal(getCachedSowGeneration(key), sow);
});
