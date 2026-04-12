"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getProjectMessages(projectId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const messages = await prisma.message.findMany({
    where: { project_id: projectId },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
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
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (!content.trim()) {
    return { success: false, error: "Message cannot be empty" };
  }

  const message = await prisma.message.create({
    data: {
      project_id: projectId,
      sender_id: user.id,
      content: content.trim(),
      milestone_id: milestoneId || null,
      is_system_message: false,
    },
  });

  revalidatePath(`/command-center/${projectId}`, "page");
  return { success: true, message };
}
