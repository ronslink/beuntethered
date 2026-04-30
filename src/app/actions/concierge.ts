"use server";

import { prisma } from "@/lib/auth";
import OpenAI from "openai";

const TIER_SCORE: Record<string, number> = {
  ELITE: 14,
  PRO: 8,
  STANDARD: 3,
};

function normalizeTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/\.(js|ts)$/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

function uniqueTerms(text: string) {
  return Array.from(
    new Set(
      normalizeTerm(text)
        .split(/\s+/)
        .filter((term) => term.length > 2)
    )
  );
}

function projectTerms(executiveSummary: string) {
  const terms = new Set(uniqueTerms(executiveSummary));
  const text = executiveSummary.toLowerCase();
  const hints: Array<{ pattern: RegExp; terms: string[] }> = [
    { pattern: /\b(web|dashboard|portal|browser|site|frontend)\b/, terms: ["react", "next", "typescript", "tailwind", "node"] },
    { pattern: /\b(api|backend|database|auth|login|account|storage)\b/, terms: ["node", "typescript", "postgres", "prisma", "supabase", "redis"] },
    { pattern: /\b(ai|agent|automation|llm|model|generation)\b/, terms: ["openai", "anthropic", "python", "typescript", "agent", "langchain"] },
    { pattern: /\b(mobile|ios|android|app store|native)\b/, terms: ["react native", "expo", "flutter", "swift", "kotlin", "mobile"] },
    { pattern: /\b(payment|checkout|billing|subscription|escrow)\b/, terms: ["stripe", "payments", "postgres", "prisma"] },
  ];

  hints.forEach((hint) => {
    if (hint.pattern.test(text)) {
      hint.terms.flatMap(uniqueTerms).forEach((term) => terms.add(term));
    }
  });

  return terms;
}

function skillOverlapScore(projectTermSet: Set<string>, skills: string[], stack: string[]) {
  const profileTerms = new Set([...skills, ...stack].flatMap(uniqueTerms));
  if (profileTerms.size === 0) return { score: 0, matches: [] as string[] };
  const matches = Array.from(profileTerms).filter((term) => projectTermSet.has(term));
  return {
    score: Math.min(32, matches.length * 8),
    matches: matches.slice(0, 5),
  };
}

async function fallbackFacilitatorSearch(executiveSummary: string, limit: number, excludeIds: string[] = []) {
  const terms = projectTerms(executiveSummary);
  const facilitators = await prisma.user.findMany({
    where: {
      role: "FACILITATOR",
      onboarding_complete: true,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: [
      { trust_score: "desc" },
      { average_ai_audit_score: "desc" },
      { total_sprints_completed: "desc" },
    ],
    take: Math.max(limit * 4, 12),
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      trust_score: true,
      total_sprints_completed: true,
      average_ai_audit_score: true,
      skills: true,
      ai_agent_stack: true,
      availability: true,
      platform_tier: true,
      portfolio_url: true,
      verifications: {
        select: { type: true, status: true },
      },
    },
  });

  return facilitators
    .map((facilitator) => {
      const overlap = skillOverlapScore(terms, facilitator.skills, facilitator.ai_agent_stack);
      const verifiedCount = facilitator.verifications.filter((verification) => verification.status === "VERIFIED").length;
      const trust = Math.min(28, Math.round((facilitator.trust_score || 0) / 4));
      const audit = Math.min(12, Math.round((facilitator.average_ai_audit_score || 0) / 9));
      const delivery = Math.min(8, facilitator.total_sprints_completed * 2);
      const tier = TIER_SCORE[facilitator.platform_tier] ?? 0;
      const readiness = (facilitator.availability ? 3 : 0) + (facilitator.portfolio_url ? 3 : 0) + Math.min(6, verifiedCount * 2);
      const matchScore = Math.max(58, Math.min(95, 35 + overlap.score + trust + audit + delivery + tier + readiness));

      return {
        ...facilitator,
        distance: null,
        match_score: matchScore,
        match_source: "fallback",
        matched_terms: overlap.matches,
        match_reason:
          overlap.matches.length > 0
            ? `Fallback match based on ${overlap.matches.join(", ")} plus trust, audit history, tier, and availability.`
            : "Fallback match ranked by trust score, audit history, tier, completed milestones, verification, and availability.",
      };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

/**
 * Generate a 1536-dimensional embedding for a text string using OpenAI's
 * text-embedding-3-small model.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * Search for the top N facilitators whose expertise_embedding is most
 * similar to the given query embedding, using pgvector's <=> operator.
 */
async function vectorSimilaritySearch(
  queryEmbedding: number[],
  limit: number
) {
  // Build the PostgreSQL array literal from the JS array
  const embeddingText = `[${queryEmbedding.join(",")}]`;

  // Use <=> for cosine distance against stored vectors
  const results = await prisma.$queryRaw<
    {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      trust_score: number;
      total_sprints_completed: number;
      average_ai_audit_score: number;
      distance: number;
    }[]
  >`
    SELECT
      id,
      name,
      email,
      image,
      trust_score,
      total_sprints_completed,
      average_ai_audit_score,
      skills,
      ai_agent_stack,
      availability,
      platform_tier,
      portfolio_url,
      CAST(${embeddingText}::text AS vector) <=> expertise_embedding AS distance
    FROM "User"
    WHERE role = 'FACILITATOR'
      AND expertise_embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Fetch a recommended squad of facilitators for a given project summary.
 * Uses real OpenAI embeddings + pgvector cosine similarity.
 */
export async function fetchRecommendedSquad(executiveSummary: string) {
  try {
    let matched: Awaited<ReturnType<typeof vectorSimilaritySearch>> = [];

    try {
      const summaryEmbedding = await generateEmbedding(executiveSummary);
      matched = await vectorSimilaritySearch(summaryEmbedding, 3);
    } catch (embeddingError) {
      console.warn("Embedding match unavailable, using fallback facilitator ranking.", embeddingError);
    }

    if (matched.length === 0) {
      return {
        success: true,
        matchData: await fallbackFacilitatorSearch(executiveSummary, 3),
      };
    }

    const fallbackFill = matched.length < 3
      ? await fallbackFacilitatorSearch(executiveSummary, 3 - matched.length, matched.map((facilitator) => facilitator.id))
      : [];

    const matchData: any[] = matched.map((f) => ({
      ...f,
      match_score: Math.max(0, Math.round((1 - f.distance) * 100)),
      match_source: "embedding",
      match_reason: "Matched by pgvector similarity, then supported by trust score and audit history.",
    }));
    matchData.push(...fallbackFill);

    return { success: true, matchData };
  } catch (err: any) {
    console.error("Squad Matching Error:", err);
    return { success: false, error: err.message };
  }
}
