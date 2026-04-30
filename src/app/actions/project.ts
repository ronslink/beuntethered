"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { sendBYOCProjectReadyAlert } from "@/lib/resend";
import {
  assessMilestoneQuality,
  normalizeGeneratedSow,
  normalizeMilestoneForStorage,
  type MilestoneQualityAssessment,
  type MilestoneStorageDraft,
} from "@/lib/milestone-quality";
import { buildBYOCSowSnapshot, calculateBYOCInviteTotals } from "@/lib/byoc-sow";

export async function createProjectFromSoW({
  sowData,
  clientEmail
}: {
  sowData: any;
  clientEmail: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized to perform this sequence. Only facilitators can scaffold BYOC structures.");

    // Rate limit: prevent the same facilitator from creating more than 5 BYOC clients per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBYOCCount = await prisma.project.count({
      where: {
        creator_id: user.id,
        is_byoc: true,
        created_at: { gte: oneDayAgo }
      }
    });
    if (recentBYOCCount >= 5) {
      throw new Error("Rate limit exceeded: maximum 5 BYOC clients per day.");
    }

    // 1. Verify client exists and is a CLIENT — reject if fabricated
    const client = await prisma.user.findUnique({ where: { email: clientEmail } });
    if (!client) {
      throw new Error("Client does not exist. Please ensure the client has registered on the platform.");
    }
    if (client.role !== "CLIENT") {
      throw new Error("The provided email belongs to a non-CLIENT user. Only registered clients can be assigned to BYOC projects.");
    }
    const clientOrganization = await prisma.organization.findFirst({
      where: {
        OR: [
          { owner_id: client.id },
          { members: { some: { user_id: client.id } } },
        ],
      },
      select: { id: true },
      orderBy: { created_at: "asc" },
    });

    const normalizedSow = normalizeGeneratedSow(sowData);
    const rawMilestones: any[] = Array.isArray(normalizedSow.milestones) ? normalizedSow.milestones : [];
    const milestoneAssessments: MilestoneQualityAssessment[] = rawMilestones.map((milestone: any) => assessMilestoneQuality(milestone));
    const firstInvalidMilestone = milestoneAssessments.find((assessment) => !assessment.passes);

    if (rawMilestones.length === 0) {
      throw new Error("Add at least one milestone before creating the project.");
    }

    if (firstInvalidMilestone) {
      throw new Error(`Milestone needs review: ${firstInvalidMilestone.blockingIssues[0]}`);
    }

    const normalizedMilestones: MilestoneStorageDraft[] = rawMilestones.map((milestone: any) => normalizeMilestoneForStorage(milestone));

    const sowSnapshot = buildBYOCSowSnapshot({
      title: normalizedSow.title,
      executiveSummary: normalizedSow.executiveSummary,
      milestones: normalizedMilestones,
    });
    const totals = calculateBYOCInviteTotals(normalizedMilestones);

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          title: normalizedSow.title,
          ai_generated_sow: sowSnapshot,
          is_byoc: true,
          status: "DRAFT",
          creator_id: user.id,
          client_id: client.id,
          organization_id: clientOrganization?.id ?? null,
          milestones: {
            create: normalizedMilestones.map((m) => ({
              title: m.title,
              description: m.description || null,
              deliverables: m.deliverables,
              acceptance_criteria: m.acceptance_criteria,
              estimated_duration_days: m.estimated_duration_days || null,
              amount: m.amount,
              status: "PENDING",
              facilitator_id: user.id
            }))
          },
          messages: {
            create: {
              content: `BYOC client verified: ${client.name ?? clientEmail} (${clientEmail}). Project created by facilitator ${user.name ?? user.email}.`,
              is_system_message: true,
              sender_id: null
            }
          }
        },
      });

      await tx.activityLog.create({
        data: {
          project_id: createdProject.id,
          actor_id: user.id,
          action: "PROJECT_CREATED",
          entity_type: "Project",
          entity_id: createdProject.id,
          metadata: {
            operation: "BYOC_REGISTERED_CLIENT_PROJECT_CREATED",
            actor_project_role: "FACILITATOR",
            byoc: true,
            client_id: client.id,
            organization_id: clientOrganization?.id ?? null,
            milestone_count: normalizedMilestones.length,
            gross_amount_cents: totals.grossAmountCents,
            platform_fee_cents: totals.platformFeeCents,
            client_total_cents: totals.clientTotalCents,
            facilitator_payout_cents: totals.facilitatorPayoutCents,
          },
        },
      });

      return createdProject;
    });

    // Force Next.js to reconstruct the Dashboard mapping updating global views
    revalidatePath("/dashboard");
    revalidatePath("/byoc/new");

    try {
      await sendBYOCProjectReadyAlert({
        clientEmail,
        projectId: project.id,
        projectTitle: normalizedSow.title,
        summary: normalizedSow.executiveSummary,
      });
    } catch (e) {
      console.error("Resend Trigger Warning: Output failure against standard boundaries", e);
    }

    return { success: true, projectId: project.id };

  } catch (error: any) {
    console.error("Critical Server Action Fault:", error);
    return { success: false, error: error.message };
  }
}

export async function closeProject({
  projectId,
  facilitatorId,
  rating,
  feedback
}: {
  projectId: string;
  facilitatorId: string;
  rating: number;
  feedback: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized Access Network");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project || project.client_id !== user.id) throw new Error("Invalid Auth Loop.");

    const uncompletedMilestones = project.milestones.filter(m => m.status !== "APPROVED_AND_PAID" && m.status !== "DISPUTED");
    if (project.billing_type === "FIXED_MILESTONE" && uncompletedMilestones.length > 0) {
       throw new Error("Cannot close Escrow until all execution phases are approved & paid.");
    }

    await prisma.review.create({
       data: {
          project_id: projectId,
          client_id: user.id,
          facilitator_id: facilitatorId,
          rating,
          feedback
       }
    });

    await prisma.project.update({
       where: { id: projectId },
       data: { status: "COMPLETED" }
    });

    // Deprecated for the MVP beta, setting hardcoded audit baseline until SOW Vectorization is complete
    const average_ai_audit_score = 100;
    const allReviews = await prisma.review.findMany({
       where: { facilitator_id: facilitatorId }
    });
    
    const avgRating = allReviews.length > 0
       ? allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length
       : rating;

    const trust_score = (average_ai_audit_score * 0.7) + ((avgRating / 5 * 100) * 0.3);

    await prisma.user.update({
       where: { id: facilitatorId },
       data: {
          average_ai_audit_score,
          trust_score,
          total_sprints_completed: { increment: 1 }
       }
    });

    revalidatePath(`/command-center`);
    revalidatePath(`/facilitators/${facilitatorId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Critical Escrow Closure Fault:", error);
    return { success: false, error: error.message };
  }
}

