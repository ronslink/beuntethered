"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { userCanManageBuyerProject } from "@/lib/project-access";
import { createSystemNotification } from "@/lib/notifications";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { clientReviewInputSchema } from "@/lib/validators";

export async function submitClientReview(input: unknown) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      throw new Error("Unauthorized: Only clients can submit reviews.");
    }
    await assertDurableRateLimit({
      key: rateLimitKey("review.submit", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = clientReviewInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error("Choose a rating from 1 to 5.");
    }
    const { projectId, facilitatorId, rating, feedback } = parsed.data;

    // Verify the project exists and can be managed by this buyer-side user.
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: { select: { facilitator_id: true } },
      },
    });

    if (!project) throw new Error("Project not found.");
    if (!(await userCanManageBuyerProject(projectId, user.id))) {
      throw new Error("Unauthorized: You need owner or admin access to review this project.");
    }

    // Verify project is completed
    if (project.status !== "COMPLETED") {
        throw new Error("Reviews can only be submitted for completed projects.");
    }
    if (!project.milestones.some((milestone) => milestone.facilitator_id === facilitatorId)) {
      throw new Error("Reviews can only be submitted for the facilitator assigned to this project.");
    }

    // Prevent duplicate reviews
    const existingReview = await prisma.review.findFirst({
        where: {
            project_id: projectId,
            client_id: user.id,
            facilitator_id: facilitatorId,
        }
    });

    if (existingReview) {
        throw new Error("A review has already been submitted for this project.");
    }

    // Safely insert the review natively
    const review = await prisma.review.create({
      data: {
        project_id: projectId,
        client_id: user.id,
        facilitator_id: facilitatorId,
        rating,
        feedback: feedback.trim(),
      },
    });

    await createSystemNotification({
      userId: facilitatorId,
      message: `You received a ${rating}-star review from a client${feedback.trim() ? `: "${feedback.trim().slice(0, 50)}${feedback.trim().length > 50 ? "..." : ""}"` : ""}`,
      type: "MILESTONE",
      href: `/command-center/${projectId}`,
    });

    revalidatePath(`/command-center/${projectId}`);
    return { success: true, reviewId: review.id };

  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    console.error("Failed to submit review:", error);
    return { success: false, error: error.message };
  }
}
