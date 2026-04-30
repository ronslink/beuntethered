export const RATE_LIMIT_ERROR_CODE = "RATE_LIMITED";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

const globalForRateLimits = globalThis as typeof globalThis & {
  __untetherRateLimits?: Map<string, Bucket>;
};

function getStore() {
  if (!globalForRateLimits.__untetherRateLimits) {
    globalForRateLimits.__untetherRateLimits = new Map();
  }
  return globalForRateLimits.__untetherRateLimits;
}

export class RateLimitError extends Error {
  code = RATE_LIMIT_ERROR_CODE;
  retryAfterSeconds: number;
  resetAt: Date;

  constructor(retryAfterMs: number, resetAtMs = Date.now() + retryAfterMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(`Too many attempts. Please try again in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.resetAt = new Date(resetAtMs);
  }
}

export function rateLimitKey(action: string, actorId: string) {
  return `${action}:${actorId}`;
}

export function checkRateLimit({ key, limit, windowMs, now = Date.now() }: RateLimitInput) {
  const store = getStore();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function assertRateLimit(input: RateLimitInput) {
  const result = checkRateLimit(input);
  if (!result.allowed) {
    const now = input.now ?? Date.now();
    throw new RateLimitError(result.resetAt - now, result.resetAt);
  }
  return result;
}

export async function assertDurableRateLimit(input: RateLimitInput) {
  const now = input.now ?? Date.now();
  const nowDate = new Date(now);
  const resetAtDate = new Date(now + input.windowMs);
  const { prisma } = await import("./auth");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "RateLimitBucket" ("key", "count", "reset_at", "created_at", "updated_at")
      VALUES (${input.key}, 0, ${nowDate}, ${nowDate}, ${nowDate})
      ON CONFLICT ("key") DO NOTHING
    `;

    const rows = await tx.$queryRaw<Array<{ count: number; reset_at: Date }>>`
      SELECT "count", "reset_at"
      FROM "RateLimitBucket"
      WHERE "key" = ${input.key}
      FOR UPDATE
    `;

    const bucket = rows[0];
    if (!bucket || bucket.reset_at.getTime() <= now) {
      await tx.$executeRaw`
        UPDATE "RateLimitBucket"
        SET "count" = 1, "reset_at" = ${resetAtDate}, "updated_at" = ${nowDate}
        WHERE "key" = ${input.key}
      `;
      return {
        allowed: true,
        remaining: Math.max(0, input.limit - 1),
        resetAt: resetAtDate.getTime(),
      };
    }

    if (bucket.count >= input.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.reset_at.getTime(),
      };
    }

    const nextCount = bucket.count + 1;
    await tx.$executeRaw`
      UPDATE "RateLimitBucket"
      SET "count" = ${nextCount}, "updated_at" = ${nowDate}
      WHERE "key" = ${input.key}
    `;

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - nextCount),
      resetAt: bucket.reset_at.getTime(),
    };
  });

  if (!result.allowed) {
    throw new RateLimitError(result.resetAt - now, result.resetAt);
  }

  return result;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function clearRateLimitsForTests() {
  getStore().clear();
}
