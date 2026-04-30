"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { displayNameInputSchema, notificationPreferencesInputSchema } from "@/lib/validators";

export async function updateDisplayName(
  name: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated." };

    await assertDurableRateLimit({
      key: rateLimitKey("profile.display-name", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = displayNameInputSchema.safeParse({ name });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid display name." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return { success: false, error: e.message };
    }
    console.error("updateDisplayName error:", e);
    return { success: false, error: e.message ?? "Failed to update name." };
  }
}

export async function updateNotificationPreferences(
  prefs: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated." };

    await assertDurableRateLimit({
      key: rateLimitKey("profile.notifications", user.id),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = notificationPreferencesInputSchema.safeParse(prefs);
    if (!parsed.success) {
      return { success: false, error: "Choose valid notification preferences before saving." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        notify_payment_updates: parsed.data.notify_payment_updates,
        notify_new_proposals: parsed.data.notify_new_proposals,
        notify_milestone_reviews: parsed.data.notify_milestone_reviews,
      },
    });

    return { success: true };
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return { success: false, error: e.message };
    }
    console.error("updateNotificationPreferences error:", e);
    return { success: false, error: e.message ?? "Failed to update preferences." };
  }
}
