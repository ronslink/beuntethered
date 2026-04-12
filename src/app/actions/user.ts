"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { encryptApiKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function updateUserAIKeys(data: { openai_key?: string, anthropic_key?: string, preferred_llm: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized Access Vector");

    // Perform validation logic restricting empty keys natively protecting router states
    // Check both encrypted (preferred) and plaintext (migration fallback) fields
    if (data.preferred_llm === "gpt-4o" && !data.openai_key) {
       const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { openai_key_encrypted: true, openai_key: true } });
       if (!existing?.openai_key_encrypted && !existing?.openai_key) {
         throw new Error("You must map an OpenAI API Key securely before utilizing the GPT-4o architecture.");
       }
    }

    if (data.preferred_llm === "claude-3-5-sonnet" && !data.anthropic_key) {
       const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { anthropic_key_encrypted: true, anthropic_key: true } });
       if (!existing?.anthropic_key_encrypted && !existing?.anthropic_key) {
         throw new Error("You must map an Anthropic API Key securely before utilizing the Claude-3.5-Sonnet architecture.");
       }
    }

    const updatePayload: Record<string, string> = { preferred_llm: data.preferred_llm };
    
    // Only overwrite keys dynamically if actively submitted by explicit input block
    if (data.openai_key && data.openai_key.trim() !== '') {
       updatePayload.openai_key_encrypted = encryptApiKey(data.openai_key.trim());
       updatePayload.openai_key = data.openai_key.trim(); // keep plaintext for migration; remove after
    }

    if (data.anthropic_key && data.anthropic_key.trim() !== '') {
       updatePayload.anthropic_key_encrypted = encryptApiKey(data.anthropic_key.trim());
       updatePayload.anthropic_key = data.anthropic_key.trim(); // keep plaintext for migration; remove after
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updatePayload
    });

    revalidatePath("/settings");
    return { success: true };
  } catch(error: any) {
    console.error("BYOK Update Boundary Fault:", error);
    return { success: false, error: error.message };
  }
}
