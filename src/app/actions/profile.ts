"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Name cannot be empty." };
    if (trimmed.length > 100) return { success: false, error: "Name too long." };

    await prisma.user.update({
      where: { id: user.id },
      data: { name: trimmed },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (e: any) {
    console.error("updateDisplayName error:", e);
    return { success: false, error: e.message ?? "Failed to update name." };
  }
}
