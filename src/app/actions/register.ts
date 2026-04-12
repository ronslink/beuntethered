"use server";

import { prisma } from "@/lib/auth";
import { hashPassword, encryptApiKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registerUser({
  email,
  password,
  name,
  role,
  openai_key,
  anthropic_key,
}: {
  email: string;
  password: string;
  name: string;
  role: "CLIENT" | "FACILITATOR";
  openai_key?: string;
  anthropic_key?: string;
}) {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const password_hash = await hashPassword(password);

    const encryptedOpenAI = openai_key?.trim() ? encryptApiKey(openai_key.trim()) : null;
    const encryptedAnthropic = anthropic_key?.trim() ? encryptApiKey(anthropic_key.trim()) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name: name || email.split("@")[0],
        role,
        openai_key: openai_key?.trim() || null,
        anthropic_key: anthropic_key?.trim() || null,
        openai_key_encrypted: encryptedOpenAI,
        anthropic_key_encrypted: encryptedAnthropic,
      },
    });

    revalidatePath("/login");
    return { success: true, userId: user.id };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message };
  }
}
