import { prisma } from "@/lib/auth";
import OpenAI from "openai";

/**
 * Generate an embedding for a block of text using text-embedding-3-small.
 * Returns the raw number array (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
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
 * Update a user's expertise_embedding column with a new vector derived from
 * their profile text (bio, skills, etc.).
 */
export async function upsertUserEmbedding(
  userId: string,
  profileText: string
): Promise<void> {
  const embedding = await generateEmbedding(profileText);
  const vectorLiteral = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "User"
    SET expertise_embedding = CAST(${vectorLiteral}::text AS vector)
    WHERE id = ${userId}
  `;
}
