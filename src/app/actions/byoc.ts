"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { normalizeMilestoneForStorage } from "@/lib/milestone-quality";
import { byocInviteInputSchema } from "@/lib/validators";
import { buildBYOCSowSnapshot, calculateBYOCInviteTotals } from "@/lib/byoc-sow";
import { sendBYOCInvite } from "@/lib/resend";
import { validateBYOCInviteRecipient } from "@/lib/byoc-recipient";
import { createSystemNotification } from "@/lib/notifications";
import { buildBYOCInviteDeliveryMetadata, buildBYOCInviteReviewNotification } from "@/lib/byoc-notifications";

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
      transitionMode: parsed.data.transitionMode,
      currentState: parsed.data.currentState,
      priorWork: parsed.data.priorWork,
      remainingWork: parsed.data.remainingWork,
      knownRisks: parsed.data.knownRisks,
    });
    const totals = calculateBYOCInviteTotals(normalizedMilestones);
    const inviteToken = randomBytes(16).toString("hex");
    const invitedClientEmail = parsed.data.clientEmail ?? null;
    const existingInviteUser = invitedClientEmail
      ? await prisma.user.findUnique({
          where: { email: invitedClientEmail },
          select: { id: true, role: true },
        })
      : null;
    const recipientCheck = validateBYOCInviteRecipient({
      invitedEmail: invitedClientEmail,
      existingUser: existingInviteUser,
      facilitatorId: user.id,
    });
    if (!recipientCheck.valid) {
      return {
        success: false,
        error: recipientCheck.message,
        code: recipientCheck.code,
      };
    }

    const project = await prisma.$transaction(async (tx) => {
      const draft = await tx.project.create({
        data: {
          title: parsed.data.title,
          ai_generated_sow: sowSnapshot,
          is_byoc: true,
          status: "DRAFT",
          creator_id: user.id, // Draft intrinsically tracks back natively bypassing Null Client errors
          invite_token: inviteToken,
          invited_client_email: invitedClientEmail,
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
            invited_client_email: invitedClientEmail,
            transition_mode: parsed.data.transitionMode,
            has_current_state: Boolean(parsed.data.currentState),
            has_prior_work: Boolean(parsed.data.priorWork),
            has_remaining_work: Boolean(parsed.data.remainingWork),
            has_known_risks: Boolean(parsed.data.knownRisks),
          },
        },
      });

      return draft;
    });

    revalidatePath("/dashboard");
    revalidatePath("/byoc/new");

    const emailDelivery = invitedClientEmail
      ? await sendBYOCInvite(invitedClientEmail, project.title, inviteToken)
      : { sent: false as const, skipped: "NO_CLIENT_EMAIL" as const };

    let inAppNotificationSent = false;
    if (existingInviteUser?.role === "CLIENT") {
      const notification = buildBYOCInviteReviewNotification({
        projectId: project.id,
        projectTitle: project.title,
        facilitatorName: user.name || user.email,
        inviteToken,
        transitionMode: parsed.data.transitionMode,
      });
      try {
        await createSystemNotification({
          userId: existingInviteUser.id,
          ...notification,
        });
        inAppNotificationSent = true;
      } catch (notificationError) {
        console.error("BYOC invite notification failed:", notificationError);
      }
    }

    await prisma.activityLog.create({
      data: {
        project_id: project.id,
        actor_id: user.id,
        action: "SYSTEM_EVENT",
        entity_type: "Project",
        entity_id: project.id,
        metadata: buildBYOCInviteDeliveryMetadata({
          invitedClientEmail,
          existingClientAccount: existingInviteUser?.role === "CLIENT",
          emailDelivery,
          inAppNotificationSent,
        }),
      },
    });

    return {
      success: true,
      inviteToken,
      projectId: project.id,
      emailDelivery,
      inAppNotification: {
        sent: inAppNotificationSent,
        skipped: existingInviteUser?.role === "CLIENT" ? null : "NO_EXISTING_CLIENT_ACCOUNT",
      },
      packet: {
        id: project.id,
        title: project.title,
        status: project.status,
        inviteToken,
        clientEmail: invitedClientEmail,
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
