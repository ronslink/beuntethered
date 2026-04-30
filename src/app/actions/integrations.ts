"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { encryptApiKey } from "@/lib/encryption";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { projectRepositoryInputSchema } from "@/lib/validators";

export async function linkProjectRepository(input: unknown) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized Access");

    await assertDurableRateLimit({
      key: rateLimitKey("integration.github.link", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = projectRepositoryInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error("Enter a valid repository URL before linking GitHub evidence.");
    }
    const data = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      include: { milestones: true }
    });

    if (!project) throw new Error("Project not found.");

    // Validate the Facilitator owns at least one milestone logically checking Execution bounds
    const isOwner = project.milestones.some(m => m.facilitator_id === user.id);
    if (!isOwner) throw new Error("Unauthorized Network Access. You are not mapped to this Escrow Phase.");

    const formattedUrl = data.repoUrl.replace(/\/$/, ""); // Clean trailing slashes securely

    const updateData: any = { github_repo_url: formattedUrl };
    if (data.token) {
       updateData.github_access_token = encryptApiKey(data.token);
    }

    await prisma.project.update({
      where: { id: data.projectId },
      data: updateData
    });

    revalidatePath("/command-center");
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message };
  }
}
