"use server";

import { prisma } from "@/lib/auth";
import { hashPassword, encryptApiKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { registrationInputSchema } from "@/lib/validators";

export async function registerUser(input: unknown) {
  try {
    const parsed = registrationInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Enter a valid email, password, and account type." };
    }

    const { email: normalizedEmail, password, name, role, openai_key, anthropic_key } = parsed.data;
    await assertDurableRateLimit({
      key: rateLimitKey("auth.register", normalizedEmail),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const password_hash = await hashPassword(password);

    const encryptedOpenAI = openai_key?.trim() ? encryptApiKey(openai_key.trim()) : null;
    const encryptedAnthropic = anthropic_key?.trim() ? encryptApiKey(anthropic_key.trim()) : null;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password_hash,
        name: name || normalizedEmail.split("@")[0],
        role,
        openai_key_encrypted: encryptedOpenAI,
        anthropic_key_encrypted: encryptedAnthropic,
        skills: [],
        ai_agent_stack: [],
      },
    });

    revalidatePath("/login");
    return { success: true, userId: user.id };
  } catch (err: any) {
    if (isRateLimitError(err)) {
      return { success: false, error: err.message, code: err.code, retryAfterSeconds: err.retryAfterSeconds };
    }
    console.error("Registration error:", err);
    return { success: false, error: err.message };
  }
}
