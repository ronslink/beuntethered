type SowGenerationCacheEntry = {
  createdAt: number;
  value: unknown;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const CACHE_SCHEMA_VERSION = "scope-loop-v2";
const cache = new Map<string, SowGenerationCacheEntry>();

export type SowGenerationCacheInput = {
  userId: string;
  prompt: string;
  mode: string;
  desiredTimeline: string;
  budgetAmount?: number | null;
  timelineDays?: number | null;
  category: string;
  complexity: string;
  conversationHistory?: string;
};

function normalizePart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function createSowGenerationCacheKey(input: SowGenerationCacheInput) {
  return [
    CACHE_SCHEMA_VERSION,
    input.userId,
    normalizePart(input.mode),
    normalizePart(input.category),
    normalizePart(input.complexity),
    normalizePart(input.desiredTimeline),
    String(input.budgetAmount ?? ""),
    String(input.timelineDays ?? ""),
    normalizePart(input.prompt),
    normalizePart(input.conversationHistory ?? ""),
  ].join("::");
}

export function getCachedSowGeneration(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setCachedSowGeneration(key: string, value: unknown) {
  cache.set(key, { createdAt: Date.now(), value });

  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}
