"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function generateAgentKey() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    // 1. Construct physical key structure
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const plaintextKey = `unth_${rawSecret}`;

    // 2. Hash securely before placing in DB scope
    const hashedKey = crypto.createHash('sha256').update(plaintextKey).digest('hex');

    // 3. Atomically overwrite any existing credential
    await prisma.user.update({
      where: { id: user.id },
      data: { agent_key_hash: hashedKey }
    });

    revalidatePath("/settings");

    // Give it back exactly once!
    return { success: true, key: plaintextKey };
  } catch (error: any) {
    console.error("Failed to construct Agent Key:", error);
    return { success: false, error: "Internal Database Fault." };
  }
}

export async function revokeAgentKey() {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Unauthorized." };
        
        await prisma.user.update({
           where: { id: user.id },
           data: { agent_key_hash: null }
        });
    
        revalidatePath("/settings");
        return { success: true };
    } catch {
        return { success: false, error: "Deletion Fault." };
    }
}
