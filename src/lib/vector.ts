import OpenAI from 'openai';

/**
 * Generate a 1536-dimensional embedding for a given text prompt using OpenAI's
 * text-embedding-3-small model, and return it as a Float32Array.
 *
 * This is used to pre-seed facilitator expertise_embedding vectors during
 * onboarding or data backfills.
 *
 * @param prompt - The text to embed (e.g., a facilitator's bio + skills summary)
 * @returns Float32Array of 1536 dimensions, ready for pgvector insertion
 *
 * @example
 * const embedding = await seedFacilitatorVector("React, TypeScript, Node.js developer with 5 years experience");
 * console.log(embedding.length); // 1536
 * console.log(embedding instanceof Float32Array); // true
 */
export async function seedFacilitatorVector(prompt: string): Promise<Float32Array> {
  const client = new OpenAI();

  let embeddingResponse;
  try {
    embeddingResponse = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
      dimensions: 1536,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OpenAI embedding API failed: ${message}`);
  }

  const embedding = embeddingResponse.data[0].embedding;

  // Convert to Float32Array for pgvector compatibility
  const float32Array = new Float32Array(embedding);

  // Mock pgvector insert — no actual database write here.
  // The returned Float32Array can be passed to prisma.$queryRaw for insertion.
  // Example (not executed):
  // await prisma.$queryRaw`INSERT INTO facilitators (expertise_embedding) VALUES (${float32Array})`;

  return float32Array;
}
