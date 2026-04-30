"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { encryptApiKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { isServerGemmaConfigured, isSupportedAIProvider } from "@/lib/ai-provider-config";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { userAIKeysInputSchema } from "@/lib/validators";

export async function updateUserAIKeys(input: unknown) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized Access Vector");

    await assertDurableRateLimit({
      key: rateLimitKey("settings.ai-keys", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = userAIKeysInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error("Choose a supported AI routing option and valid key fields.");
    }
    const data = parsed.data;

    if (!isSupportedAIProvider(data.preferred_llm)) {
      throw new Error("Choose a supported AI routing option.");
    }

    // Perform validation logic restricting empty keys natively protecting router states
    // Check both encrypted (preferred) and plaintext (migration fallback) fields
    if (data.preferred_llm === "gpt-4o" && !data.openai_key) {
       const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { openai_key_encrypted: true } });
       if (!existing?.openai_key_encrypted) {
         throw new Error("You must map an OpenAI API Key securely before utilizing the GPT-4o architecture.");
       }
    }

    if (data.preferred_llm === "claude-3-5-sonnet" && !data.anthropic_key) {
       const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { anthropic_key_encrypted: true } });
       if (!existing?.anthropic_key_encrypted) {
         throw new Error("You must map an Anthropic API Key securely before utilizing the Claude-3.5-Sonnet architecture.");
       }
    }

    if (data.preferred_llm === "gemini-1.5-pro" && !data.google_key) {
       const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { google_key_encrypted: true } });
       if (!existing?.google_key_encrypted) {
         throw new Error("You must map a Google Gemini API Key securely before utilizing the Gemini-1.5-Pro architecture.");
       }
    }

    if (data.preferred_llm === "gemma-4-server" && !isServerGemmaConfigured()) {
       throw new Error("Self-hosted Gemma is not configured. Set GEMMA_BASE_URL before selecting this route.");
    }

    const updatePayload: Record<string, string> = { preferred_llm: data.preferred_llm };
    
    // Only overwrite keys dynamically if actively submitted by explicit input block
    if (data.openai_key && data.openai_key.trim() !== '') {
       updatePayload.openai_key_encrypted = encryptApiKey(data.openai_key.trim());
    }

    if (data.anthropic_key && data.anthropic_key.trim() !== '') {
       updatePayload.anthropic_key_encrypted = encryptApiKey(data.anthropic_key.trim());
    }

    if (data.google_key && data.google_key.trim() !== '') {
       updatePayload.google_key_encrypted = encryptApiKey(data.google_key.trim());
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updatePayload
    });

    revalidatePath("/settings");
    return { success: true };
  } catch(error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds };
    }
    console.error("BYOK Update Boundary Fault:", error);
    return { success: false, error: error.message };
  }
}
