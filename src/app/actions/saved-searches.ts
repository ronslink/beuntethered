"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { savedSearchInputSchema, savedSearchUpdateInputSchema } from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function saveMarketplaceSearch(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, code: "UNAUTHORIZED", error: "Only facilitators can save marketplace searches." };
  }
  try {
    await assertDurableRateLimit({
      key: rateLimitKey("saved-search.create", user.id),
      limit: 25,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }

  const parsed = savedSearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_SEARCH", error: "Name the search before saving it." };
  }

  const saved = await prisma.savedSearch.create({
    data: {
      user_id: user.id,
      name: parsed.data.name,
      filters: parsed.data.filters as Prisma.InputJsonObject,
      alert_frequency: parsed.data.alertFrequency,
      enabled: parsed.data.enabled,
    },
  });

  revalidatePath("/marketplace");
  return { success: true, savedSearchId: saved.id };
}

export async function deleteMarketplaceSearch(savedSearchId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, code: "UNAUTHORIZED", error: "Only facilitators can manage saved searches." };
  }

  await prisma.savedSearch.deleteMany({
    where: { id: savedSearchId, user_id: user.id },
  });

  revalidatePath("/marketplace");
  return { success: true };
}

export async function updateMarketplaceSearch(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, code: "UNAUTHORIZED", error: "Only facilitators can manage saved searches." };
  }

  const parsed = savedSearchUpdateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_SEARCH_UPDATE", error: "Choose an alert setting to update." };
  }

  const data: Prisma.SavedSearchUpdateInput = {};
  if (parsed.data.alertFrequency !== undefined) {
    data.alert_frequency = parsed.data.alertFrequency;
  }
  if (parsed.data.enabled !== undefined) {
    data.enabled = parsed.data.enabled;
  }

  const result = await prisma.savedSearch.updateMany({
    where: { id: parsed.data.savedSearchId, user_id: user.id },
    data,
  });

  if (result.count === 0) {
    return { success: false, code: "SEARCH_NOT_FOUND", error: "Saved alert not found." };
  }

  revalidatePath("/marketplace");
  return { success: true };
}
