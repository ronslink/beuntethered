"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { messageInputSchema, messageWithAttachmentsInputSchema } from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { getUploadFilesFromFormData, uploadAttachmentFile } from "@/lib/storage";
import { PROJECT_MESSAGE_ACCESS_DENIED, assertProjectMessageAccess } from "@/lib/project-access";

const INVALID_MESSAGE_MILESTONE = "Message milestone must belong to this project.";

type MessageActionError = {
  success: false;
  code: string;
  error: string;
  retryAfterSeconds?: number;
};

async function assertMessageMilestone(projectId: string, milestoneId?: string) {
  if (!milestoneId) return;

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, project_id: projectId },
    select: { id: true },
  });

  if (!milestone) {
    throw new Error(INVALID_MESSAGE_MILESTONE);
  }
}

function messageActionError(error: any): MessageActionError {
  if (isRateLimitError(error)) {
    return {
      success: false,
      code: error.code,
      error: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  if (error?.message === PROJECT_MESSAGE_ACCESS_DENIED) {
    return { success: false, code: "MESSAGE_ACCESS_DENIED", error: PROJECT_MESSAGE_ACCESS_DENIED };
  }

  if (error?.message === INVALID_MESSAGE_MILESTONE) {
    return { success: false, code: "INVALID_MESSAGE_MILESTONE", error: INVALID_MESSAGE_MILESTONE };
  }

  return { success: false, code: "MESSAGE_SEND_FAILED", error: error?.message || "Unable to send message." };
}

export async function getProjectMessages(projectId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertProjectMessageAccess(projectId, user.id);

  const messages = await prisma.message.findMany({
    where: { project_id: projectId },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
      attachments: {
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return messages;
}

export async function sendMessage(
  projectId: string,
  content: string,
  milestoneId?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    await assertDurableRateLimit({
      key: rateLimitKey("message.send", user.id),
      limit: 60,
      windowMs: 60 * 1000,
    });
    const parsed = messageInputSchema.safeParse({ projectId, content, milestoneId });
    if (!parsed.success) {
      return { success: false, code: "INVALID_MESSAGE", error: "Write a message before sending." };
    }

    const { projectId: parsedProjectId, content: parsedContent, milestoneId: parsedMilestoneId } = parsed.data;
    await assertProjectMessageAccess(parsedProjectId, user.id);
    await assertMessageMilestone(parsedProjectId, parsedMilestoneId);

    const message = await prisma.message.create({
      data: {
        project_id: parsedProjectId,
        sender_id: user.id,
        content: parsedContent,
        milestone_id: parsedMilestoneId || null,
        is_system_message: false,
      },
    });

    await recordActivity({
      projectId: parsedProjectId,
      actorId: user.id,
      milestoneId: parsedMilestoneId || null,
      action: "MESSAGE_SENT",
      entityType: "Message",
      entityId: message.id,
    });

    revalidatePath(`/command-center/${parsedProjectId}`, "page");
    return { success: true, message };
  } catch (error: any) {
    return messageActionError(error);
  }
}

export async function sendMessageWithAttachments(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    await assertDurableRateLimit({
      key: rateLimitKey("message.send", user.id),
      limit: 60,
      windowMs: 60 * 1000,
    });

    const files = getUploadFilesFromFormData(formData, "attachments");
    const parsed = messageWithAttachmentsInputSchema.safeParse({
      projectId: formData.get("projectId"),
      content: formData.get("content") ?? "",
      milestoneId: formData.get("milestoneId") || undefined,
    });

    if (!parsed.success) {
      return { success: false, code: "INVALID_MESSAGE", error: "Keep messages under 4,000 characters." };
    }

    const { projectId, content, milestoneId } = parsed.data;
    if (!content && files.length === 0) {
      return { success: false, code: "INVALID_MESSAGE", error: "Write a message or attach a file before sending." };
    }

    await assertProjectMessageAccess(projectId, user.id);
    await assertMessageMilestone(projectId, milestoneId);

    const uploadedAttachments = [];
    for (const file of files) {
      uploadedAttachments.push(
        await uploadAttachmentFile({
          file,
          projectId,
          uploaderId: user.id,
          purpose: "MESSAGE",
          entityId: projectId,
        })
      );
    }

    const message = await prisma.message.create({
      data: {
        project_id: projectId,
        sender_id: user.id,
        content: content || "Attached evidence.",
        milestone_id: milestoneId || null,
        is_system_message: false,
      },
    });

    if (uploadedAttachments.length > 0) {
      await prisma.attachment.createMany({
        data: uploadedAttachments.map((attachment) => ({
          uploader_id: user.id,
          project_id: projectId,
          milestone_id: milestoneId || null,
          message_id: message.id,
          name: attachment.name,
          url: attachment.url,
          content_type: attachment.contentType,
          size_bytes: attachment.sizeBytes,
          purpose: "MESSAGE",
        })),
      });
    }

    await recordActivity({
      projectId,
      actorId: user.id,
      milestoneId: milestoneId || null,
      action: "MESSAGE_SENT",
      entityType: "Message",
      entityId: message.id,
      metadata: { attachment_count: uploadedAttachments.length },
    });

    revalidatePath(`/command-center/${projectId}`, "page");
    return { success: true, message };
  } catch (error: any) {
    return messageActionError(error);
  }
}
