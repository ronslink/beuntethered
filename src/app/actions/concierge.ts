"use server";

import { prisma } from "@/lib/auth";
import OpenAI from "openai";

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
    const summaryEmbedding = await generateEmbedding(executiveSummary);
    const matched = await vectorSimilaritySearch(summaryEmbedding, 3);

    const matchData = matched.map((f) => ({
      ...f,
      match_score: Math.max(0, Math.round((1 - f.distance) * 100)),
    }));

    return { success: true, matchData };
  } catch (err: any) {
    console.error("Squad Matching Error:", err);
    return { success: false, error: err.message };
  }
}
