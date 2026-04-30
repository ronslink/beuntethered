import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRateLimit,
  checkRateLimit,
  clearRateLimitsForTests,
  isRateLimitError,
  rateLimitKey,
} from "../src/lib/rate-limit.ts";

test("allows requests until a bucket reaches its limit", () => {
  clearRateLimitsForTests();
  const key = rateLimitKey("unit", "actor_1");

  assert.deepEqual(checkRateLimit({ key, limit: 2, windowMs: 1000, now: 100 }), {
    allowed: true,
    remaining: 1,
    resetAt: 1100,
  });
  assert.deepEqual(checkRateLimit({ key, limit: 2, windowMs: 1000, now: 200 }), {
    allowed: true,
    remaining: 0,
    resetAt: 1100,
  });
  assert.deepEqual(checkRateLimit({ key, limit: 2, windowMs: 1000, now: 300 }), {
    allowed: false,
    remaining: 0,
    resetAt: 1100,
  });
});

test("resets buckets after the rate limit window", () => {
  clearRateLimitsForTests();
  const key = rateLimitKey("unit", "actor_2");

  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 100 }).allowed, true);
  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 200 }).allowed, false);
  assert.deepEqual(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 1200 }), {
    allowed: true,
    remaining: 0,
    resetAt: 2200,
  });
});

test("throws a typed error when a request is limited", () => {
  clearRateLimitsForTests();
  const key = rateLimitKey("unit", "actor_3");

  assertRateLimit({ key, limit: 1, windowMs: 5000, now: 1000 });

  assert.throws(
    () => assertRateLimit({ key, limit: 1, windowMs: 5000, now: 2000 }),
    (error) => isRateLimitError(error) && error.retryAfterSeconds === 4
  );
});
