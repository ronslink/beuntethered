import OpenAI from 'openai';

import { prisma } from '@/lib/auth';

/**
 * Generate a 1536-dimensional embedding for a given text prompt using OpenAI's
 * text-embedding-3-small model, and persist it to PostgreSQL via pgvector.
 *
 * This is used to seed facilitator expertise_embedding vectors during
 * onboarding or data backfills.
 *
 * @param userId - The ID of the Facilitator User to update
 * @param prompt - The text to embed (e.g., a facilitator's bio + skills summary)
 * @returns Object with success status
 */
export async function seedFacilitatorVector(userId: string, prompt: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new OpenAI();
    const embeddingResponse = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
      dimensions: 1536,
    });

    const embedding = embeddingResponse.data[0].embedding;
    const embeddingText = `[${embedding.join(",")}]`;

    // Persist to pgvector using native parameterized execution
    await prisma.$executeRaw`UPDATE "User" SET expertise_embedding = CAST(${embeddingText}::text AS vector) WHERE id = ${userId}`;

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`OpenAI embedding execution natively bound failed: ${message}`);
    return { success: false, error: message };
  }
}
