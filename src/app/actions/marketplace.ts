"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { recordActivity } from "@/lib/activity";
import { projectPostingSchema } from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { normalizeMilestoneForStorage, type MilestoneStorageDraft } from "@/lib/milestone-quality";
import {
  assessProjectScopeRisk,
  requestRiskFingerprintFromHeaders,
} from "@/lib/account-risk";
import { recordAccountRiskSignal } from "@/lib/account-risk-db";

export async function postProjectToMarketplace(sowData: any) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized to post projects to Marketplace.");
    const riskFingerprint = requestRiskFingerprintFromHeaders(await headers());
    await assertDurableRateLimit({
      key: rateLimitKey("project.post", user.id),
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = projectPostingSchema.safeParse(sowData);
    if (!parsed.success) {
      return { success: false, code: "INVALID_PROJECT_SCOPE", error: "Please review the scope, milestones, and budget before posting." };
    }
    const data = parsed.data;
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } },
        ],
      },
      select: { id: true },
      orderBy: { created_at: "asc" },
    });

    const normalizedMilestones: MilestoneStorageDraft[] = data.milestones.map((milestone) => normalizeMilestoneForStorage(milestone));

    // Transmute AI JSON heavily into Prisma Escrow objects flawlessly
    const project = await prisma.project.create({
      data: {
        title: data.title,
        ai_generated_sow: data.executiveSummary,
        is_byoc: false,
        status: "OPEN_BIDDING",
        creator_id: user.id,
        client_id: user.id,
        organization_id: organization?.id ?? null,
        bidding_closes_at: data.biddingClosesAt ? new Date(data.biddingClosesAt) : null,
        milestones: {
          create: normalizedMilestones.map((m) => ({
            title: m.title,
            description: m.description || null,
            acceptance_criteria: m.acceptance_criteria,
            deliverables: m.deliverables,
            estimated_duration_days: m.estimated_duration_days || null,
            amount: m.amount,
            status: "PENDING"
          }))
        }
      },
      include: {
        milestones: true
      }
    });

    await recordActivity({
      projectId: project.id,
      actorId: user.id,
      action: "PROJECT_POSTED",
      entityType: "Project",
      entityId: project.id,
      metadata: {
        milestone_count: project.milestones.length,
        selected_facilitators: data.selected_facilitators.length,
        organization_id: organization?.id ?? null,
      },
    });

    await recordAccountRiskSignal({
      eventType: "PROJECT_POSTED",
      severity: "INFO",
      userId: user.id,
      projectId: project.id,
      fingerprint: riskFingerprint,
      reason: "Marketplace project posted. Hashed request signals captured for abuse review only.",
      metadata: {
        organization_id: organization?.id ?? null,
        milestone_count: project.milestones.length,
      },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentComparableProjects = await prisma.project.findMany({
      where: {
        id: { not: project.id },
        status: { in: ["OPEN_BIDDING", "ACTIVE"] },
        created_at: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        title: true,
        ai_generated_sow: true,
        creator_id: true,
        organization_id: true,
        account_risk_signals: {
          where: { event_type: "PROJECT_POSTED" },
          select: { hashed_ip: true, user_agent_hash: true },
          take: 3,
          orderBy: { created_at: "desc" },
        },
      },
      take: 25,
      orderBy: { created_at: "desc" },
    });

    const scopeRisk = assessProjectScopeRisk({
      userId: user.id,
      organizationId: organization?.id ?? null,
      title: data.title,
      aiGeneratedSow: data.executiveSummary,
      fingerprint: riskFingerprint,
      candidates: recentComparableProjects,
    });

    if (scopeRisk.matchedProjectId) {
      await recordAccountRiskSignal({
        eventType: "DUPLICATE_SCOPE_REVIEW",
        severity: scopeRisk.severity,
        userId: user.id,
        projectId: project.id,
        fingerprint: riskFingerprint,
        reason: scopeRisk.reason,
        metadata: {
          matched_project_id: scopeRisk.matchedProjectId,
          similarity: scopeRisk.similarity,
          linked_signals: scopeRisk.linkedSignals,
        },
      });

      if (scopeRisk.severity === "REVIEW") {
        await recordActivity({
          projectId: project.id,
          actorId: user.id,
          action: "SYSTEM_EVENT",
          entityType: "AccountRiskSignal",
          entityId: scopeRisk.matchedProjectId,
          metadata: {
            operation: "DUPLICATE_SCOPE_REVIEW",
            matched_project_id: scopeRisk.matchedProjectId,
            similarity: scopeRisk.similarity,
            linked_signals: scopeRisk.linkedSignals,
            buyer_visible: false,
          },
        });
      }
    }

    // Check if the wizard was successfully executed via the AI Concierge Vector mapping logic
    if (data.mode === "CONCIERGE" && data.selected_facilitators.length > 0) {
       // Bind identical chronological mapping array connecting the newly minted milestones to the user ID array
       const membersData = data.selected_facilitators.flatMap((fac, index: number) => {
          const matchedMilestone = project.milestones[index];
          if (!matchedMilestone) return [];
          return [{
             milestone_id: matchedMilestone.id,
             facilitator_id: fac.id
          }];
       });

       if (membersData.length > 0) {
          await prisma.squadProposal.create({
             data: {
                project_id: project.id,
                pitch_to_client: "This architectural combination of verified developers was directly assembled by our AI Concierge Matcher based on explicit vector metric overlap against the Scope of Work constraints. This represents the optimal execution squad.",
                status: "PENDING",
                members: {
                   create: membersData
                }
             }
          });
       }
    }

    revalidatePath("/marketplace");
    revalidatePath("/dashboard");

    return { success: true, projectId: project.id };

  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    console.error("Critical Server Action Fault:", error);
    return { success: false, error: error.message };
  }
}
