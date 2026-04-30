"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { recordActivity } from "@/lib/activity";
import { projectInviteInputSchema } from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { assertProjectBuyerManager, getProjectBuyerActivityMetadata } from "@/lib/project-access";

export async function inviteFacilitatorToProject(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return { success: false, code: "UNAUTHORIZED", error: "Only clients can invite facilitators." };
  }
  try {
    await assertDurableRateLimit({
      key: rateLimitKey("invite.send", user.id),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }

  const parsed = projectInviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_INVITE", error: "Choose a project and facilitator before sending an invite." };
  }

  const { projectId, facilitatorId, message } = parsed.data;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true },
  });

  if (!project) {
    return { success: false, code: "PROJECT_NOT_FOUND", error: "You can only invite talent to your own projects." };
  }
  try {
    await assertProjectBuyerManager(projectId, user.id);
  } catch {
    return { success: false, code: "FORBIDDEN", error: "You need owner or admin access to invite facilitators." };
  }
  const buyerAudit = await getProjectBuyerActivityMetadata(projectId, user.id);
  if (project.status !== "OPEN_BIDDING") {
    return { success: false, code: "PROJECT_CLOSED", error: "This project is no longer accepting proposals." };
  }

  const facilitator = await prisma.user.findUnique({
    where: { id: facilitatorId },
    select: { id: true, role: true },
  });
  if (!facilitator || facilitator.role !== "FACILITATOR") {
    return { success: false, code: "INVALID_FACILITATOR", error: "Select an active facilitator to invite." };
  }

  const existingInvite = await prisma.projectInvite.findUnique({
    where: { project_id_facilitator_id: { project_id: projectId, facilitator_id: facilitatorId } },
    select: { id: true, status: true },
  });
  if (existingInvite && existingInvite.status !== "DECLINED") {
    return {
      success: true,
      inviteId: existingInvite.id,
      status: existingInvite.status,
      alreadyInvited: true,
    };
  }

  const invite = await prisma.projectInvite.upsert({
    where: { project_id_facilitator_id: { project_id: projectId, facilitator_id: facilitatorId } },
    update: { status: "SENT", message, inviter_id: user.id, viewed_at: null, responded_at: null },
    create: {
      project_id: projectId,
      inviter_id: user.id,
      facilitator_id: facilitatorId,
      message,
    },
  });

  await recordActivity({
    projectId,
    actorId: user.id,
    action: "INVITE_SENT",
    entityType: "ProjectInvite",
    entityId: invite.id,
    metadata: { ...buyerAudit, facilitator_id: facilitatorId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/marketplace/project/${projectId}`);
  revalidatePath("/talent");
  return { success: true, inviteId: invite.id, status: invite.status };
}

export async function respondToProjectInvite(inviteId: string, status: "ACCEPTED" | "DECLINED") {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, code: "UNAUTHORIZED", error: "Only facilitators can respond to invites." };
  }

  const invite = await prisma.projectInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.facilitator_id !== user.id) {
    return { success: false, code: "INVITE_NOT_FOUND", error: "Invite not found." };
  }

  await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status, viewed_at: invite.viewed_at ?? new Date(), responded_at: new Date() },
  });

  await recordActivity({
    projectId: invite.project_id,
    actorId: user.id,
    action: "INVITE_RESPONDED",
    entityType: "ProjectInvite",
    entityId: invite.id,
    metadata: { status },
  });

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/project/${invite.project_id}`);
  revalidatePath(`/projects/${invite.project_id}`);
  return { success: true };
}

export async function markProjectInviteViewed(inviteId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FACILITATOR") {
    return { success: false, code: "UNAUTHORIZED", error: "Only facilitators can view invites." };
  }

  const invite = await prisma.projectInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.facilitator_id !== user.id) {
    return { success: false, code: "INVITE_NOT_FOUND", error: "Invite not found." };
  }

  if (invite.status !== "SENT" || invite.viewed_at) {
    return { success: true };
  }

  await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { status: "VIEWED", viewed_at: new Date() },
  });

  await recordActivity({
    projectId: invite.project_id,
    actorId: user.id,
    action: "SYSTEM_EVENT",
    entityType: "ProjectInvite",
    entityId: invite.id,
    metadata: { operation: "INVITE_VIEWED" },
  });

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/project/${invite.project_id}`);
  revalidatePath(`/projects/${invite.project_id}`);
  return { success: true };
}
