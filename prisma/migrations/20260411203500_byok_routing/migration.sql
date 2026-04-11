-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anthropic_key" TEXT,
ADD COLUMN     "openai_key" TEXT,
ADD COLUMN     "preferred_llm" TEXT NOT NULL DEFAULT 'gpt-4o-mini';
