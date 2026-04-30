"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { encryptApiKey } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { syncPortfolioVerification } from "@/lib/facilitator-verification";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { onboardingStepInputSchema } from "@/lib/validators";

// ─── Types ────────────────────────────────────────────
export type OnboardingStepData =
  | { step: "legal"; addressLine1: string; addressCity: string; addressState: string; addressZip: string; addressCountry: string; tosAccepted: boolean }
  | { step: "profile"; bio: string; skills: string[]; aiAgentStack: string[]; portfolioUrl: string; availability: string; yearsExperience: number; preferredProjectSize: string }
  | { step: "pricing"; hourlyRate: number }
  | { step: "byoc"; openaiKey?: string; anthropicKey?: string; googleKey?: string }
  | { step: "preferences"; companyName: string; companyType: string; preferredBidType: string; typicalProjectBudget: string };

// ─── Partial step save (allows resuming) ─────────────
export async function saveOnboardingStep(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated." };

    await assertDurableRateLimit({
      key: rateLimitKey("onboarding.save", user.id),
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = onboardingStepInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Enter valid onboarding details before continuing." };
    }
    const data = parsed.data;

    const update: Record<string, unknown> = {};

    if (data.step === "legal") {
      update.address_line1 = data.addressLine1;
      update.address_city = data.addressCity;
      update.address_state = data.addressState;
      update.address_zip = data.addressZip;
      update.address_country = data.addressCountry || "US";
      if (data.tosAccepted) {
        update.tos_accepted_at = new Date();
        update.tos_version = "v1.0";
      }
    }

    if (data.step === "profile") {
      update.bio = data.bio;
      update.skills = data.skills;
      update.ai_agent_stack = data.aiAgentStack;
      update.portfolio_url = data.portfolioUrl || null;
      update.availability = data.availability;
      update.years_experience = data.yearsExperience || null;
      update.preferred_project_size = data.preferredProjectSize;
    }

    if (data.step === "pricing") {
      update.hourly_rate = data.hourlyRate ?? 0;
    }

    if (data.step === "byoc") {
      const encOai = data.openaiKey ? encryptApiKey(data.openaiKey) : "";
      const encAnt = data.anthropicKey ? encryptApiKey(data.anthropicKey) : "";
      const encGoo = data.googleKey ? encryptApiKey(data.googleKey) : "";
      if (encOai) update.openai_key_encrypted = encOai;
      if (encAnt) update.anthropic_key_encrypted = encAnt;
      if (encGoo) update.google_key_encrypted = encGoo;
    }

    if (data.step === "preferences") {
      update.company_name = data.companyName || null;
      update.company_type = data.companyType || null;
      update.preferred_bid_type = data.preferredBidType;
      update.typical_project_budget = data.typicalProjectBudget;
    }

    await prisma.user.update({ where: { id: user.id }, data: update });

    if (data.step === "profile" && user.role === "FACILITATOR") {
      await syncPortfolioVerification({
        userId: user.id,
        portfolioUrl: data.portfolioUrl || null,
        bio: data.bio,
        skills: data.skills,
        aiToolStack: data.aiAgentStack,
      });
    }

    revalidatePath("/settings");
    revalidatePath("/talent");
    return { success: true };
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return { success: false, error: e.message };
    }
    console.error("saveOnboardingStep error:", e);
    return { success: false, error: e.message ?? "Failed to save." };
  }
}

// ─── Complete onboarding (final step) ────────────────
export async function completeOnboarding(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Save the final step data first
    const saveResult = await saveOnboardingStep(data);
    if (!saveResult.success) return saveResult;

    // Lock in completion
    await prisma.user.update({
      where: { id: user.id },
      data: { onboarding_complete: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return { success: false, error: e.message };
    }
    console.error("completeOnboarding error:", e);
    return { success: false, error: e.message ?? "Failed to complete onboarding." };
  }
}
