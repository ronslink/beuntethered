"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { hashAgentToken } from "@/lib/agent-api-rules";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function generateAgentKey() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return { success: false, code: "UNAUTHORIZED", error: "Sign in before generating an automation key." };
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "FACILITATOR") {
      return {
        success: false,
        code: "FACILITATOR_ONLY",
        error: "Automation keys are available only for facilitator delivery accounts.",
      };
    }

    await assertDurableRateLimit({
      key: rateLimitKey("agent-key.generate", user.id),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    const rawSecret = crypto.randomBytes(32).toString("hex");
    const plaintextKey = `unth_${rawSecret}`;
    const hashedKey = hashAgentToken(plaintextKey);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        agent_key_hash: hashedKey,
        api_daily_request_count: 0,
        locked_until: null,
      },
    });

    revalidatePath("/settings");

    return { success: true, key: plaintextKey };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return {
        success: false,
        code: error.code,
        error: error.message,
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    console.error("Failed to create automation key:", error);
    return { success: false, code: "AGENT_KEY_FAILED", error: "Unable to create automation key. Please try again." };
  }
}

export async function revokeAgentKey() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return { success: false, code: "UNAUTHORIZED", error: "Sign in before revoking an automation key." };
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "FACILITATOR") {
      return {
        success: false,
        code: "FACILITATOR_ONLY",
        error: "Automation keys are available only for facilitator delivery accounts.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        agent_key_hash: null,
        api_daily_request_count: 0,
        locked_until: null,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke automation key:", error);
    return { success: false, code: "AGENT_KEY_FAILED", error: "Unable to revoke automation key. Please try again." };
  }
}
