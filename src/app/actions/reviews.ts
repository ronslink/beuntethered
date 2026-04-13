"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function submitClientReview({
  projectId,
  facilitatorId,
  rating,
  feedback,
}: {
  projectId: string;
  facilitatorId: string;
  rating: number;
  feedback: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      throw new Error("Unauthorized: Only clients can submit reviews.");
    }

    // Verify the project exists and belongs to the client
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
      },
    });

    if (!project) throw new Error("Project not found.");
    if (project.client_id !== user.id) {
      throw new Error("Unauthorized: You are not the client for this project.");
    }

    // Verify project is completed
    if (project.status !== "COMPLETED") {
        throw new Error("Reviews can only be submitted for completed projects.");
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
        feedback,
      },
    });

    revalidatePath(`/command-center/${projectId}`);
    return { success: true, reviewId: review.id };

  } catch (error: any) {
    console.error("Failed to submit review:", error);
    return { success: false, error: error.message };
  }
}
