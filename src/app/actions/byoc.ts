"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { normalizeMilestoneForStorage } from "@/lib/milestone-quality";
import { byocInviteInputSchema } from "@/lib/validators";
import { buildBYOCSowSnapshot, calculateBYOCInviteTotals } from "@/lib/byoc-sow";

export async function generateBYOCInvite(sowData: any) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Only facilitators can create BYOC invites.");

    await assertDurableRateLimit({
      key: rateLimitKey("byoc.invite", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = byocInviteInputSchema.safeParse(sowData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Review the scope and milestone evidence before creating an invite.",
        code: "BYOC_SCOPE_INVALID",
      };
    }

    const normalizedMilestones = parsed.data.milestones.map(normalizeMilestoneForStorage);
    const sowSnapshot = buildBYOCSowSnapshot({
      title: parsed.data.title,
      executiveSummary: parsed.data.executiveSummary,
      milestones: normalizedMilestones,
    });
    const totals = calculateBYOCInviteTotals(normalizedMilestones);
    const inviteToken = randomBytes(16).toString("hex");

    const project = await prisma.$transaction(async (tx) => {
      const draft = await tx.project.create({
        data: {
          title: parsed.data.title,
          ai_generated_sow: sowSnapshot,
          is_byoc: true,
          status: "DRAFT",
          creator_id: user.id, // Draft intrinsically tracks back natively bypassing Null Client errors
          invite_token: inviteToken,
          milestones: {
            create: normalizedMilestones.map((milestone) => ({
              title: milestone.title,
              amount: milestone.amount,
              description: milestone.description,
              deliverables: milestone.deliverables,
              acceptance_criteria: milestone.acceptance_criteria,
              estimated_duration_days: milestone.estimated_duration_days,
              status: "PENDING",
              facilitator_id: user.id,
            }))
          }
        }
      });

      await tx.activityLog.create({
        data: {
          project_id: draft.id,
          actor_id: user.id,
          action: "PROJECT_CREATED",
          entity_type: "Project",
          entity_id: draft.id,
          metadata: {
            operation: "BYOC_INVITE_CREATED",
            actor_project_role: "FACILITATOR",
            byoc: true,
            milestone_count: normalizedMilestones.length,
            gross_amount_cents: totals.grossAmountCents,
            platform_fee_cents: totals.platformFeeCents,
            client_total_cents: totals.clientTotalCents,
            facilitator_payout_cents: totals.facilitatorPayoutCents,
          },
        },
      });

      return draft;
    });

    revalidatePath("/dashboard");
    revalidatePath("/byoc/new");

    return {
      success: true,
      inviteToken,
      projectId: project.id,
      packet: {
        id: project.id,
        title: project.title,
        status: project.status,
        inviteToken,
        createdAt: project.created_at.toISOString(),
        clientTotalCents: totals.clientTotalCents,
        facilitatorPayoutCents: totals.facilitatorPayoutCents,
      },
    };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds };
    }
    console.error("BYOC invite generation failed:", error);
    return { success: false, error: error.message };
  }
}
