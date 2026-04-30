import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { createSystemNotification } from "@/lib/notifications";
import { getBYOCTransitionBaseline } from "@/lib/byoc-transition";

export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    // Require authentication before claiming the invite.
    if (!user) {
      return NextResponse.redirect(new URL(`/invite/${params.token}`, req.url));
    }
    if (user.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard?invite_error=client_account_required", req.url));
    }

    const project = await prisma.project.findUnique({
      where: { invite_token: params.token },
      select: {
        id: true,
        title: true,
        status: true,
        is_byoc: true,
        creator_id: true,
        client_id: true,
        invited_client_email: true,
        ai_generated_sow: true,
        milestones: {
          orderBy: { id: "asc" },
          take: 1,
          select: { id: true, title: true, amount: true },
        },
      },
    });

    if (!project || project.status !== "DRAFT" || !project.is_byoc) {
       // Prevent dual-claims mapping to null
       return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (project.invited_client_email && user.email.toLowerCase() !== project.invited_client_email.toLowerCase()) {
      return NextResponse.redirect(new URL("/dashboard?invite_error=wrong_client_email", req.url));
    }

    const clientOrganization = await prisma.organization.findFirst({
      where: {
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } },
        ],
      },
      select: { id: true },
      orderBy: { created_at: "asc" },
    });

    const claimed = await prisma.project.updateMany({
      where: {
        id: project.id,
        status: "DRAFT",
        is_byoc: true,
        invite_token: params.token,
        client_id: null,
      },
      data: {
        client_id: user.id,
        organization_id: clientOrganization?.id ?? null,
        status: "ACTIVE",
        invite_token: null
      }
    });

    if (claimed.count !== 1) {
      return NextResponse.redirect(new URL("/dashboard?invite_error=already_claimed", req.url));
    }

    const transitionBaseline = getBYOCTransitionBaseline(project.ai_generated_sow);
    const firstMilestone = project.milestones[0] ?? null;

    await Promise.all([
      recordActivity({
        projectId: project.id,
        actorId: user.id,
        action: "SYSTEM_EVENT",
        entityType: "Project",
        entityId: project.id,
        metadata: {
          operation: "BYOC_INVITE_CLAIMED",
          actor_project_role: "CLIENT",
          byoc: true,
          organization_id: clientOrganization?.id ?? null,
          transition_mode: transitionBaseline?.transitionMode ?? null,
          first_milestone_id: firstMilestone?.id ?? null,
          first_milestone_title: firstMilestone?.title ?? null,
          first_milestone_amount_cents: firstMilestone ? Math.round(Number(firstMilestone.amount) * 100) : null,
          next_action: "FUND_FIRST_MILESTONE",
        },
      }),
      prisma.message.create({
        data: {
          project_id: project.id,
          sender_id: null,
          is_system_message: true,
          content: [
            `Private BYOC packet claimed by ${user.name || user.email}.`,
            transitionBaseline
              ? `Transition baseline: ${transitionBaseline.transitionMode}. Untether governs funded milestones from this claim forward.`
              : "Untether governs funded milestones from this claim forward.",
            firstMilestone
              ? `Next action: fund "${firstMilestone.title}" to open delivery and evidence submission.`
              : "Next action: add or confirm the first milestone before work begins.",
          ].join("\n"),
        },
      }),
      createSystemNotification({
        userId: project.creator_id,
        message: `${user.name || "A client"} claimed the private BYOC project "${project.title}".`,
        type: "SUCCESS",
        href: `/command-center/${project.id}`,
        sourceKey: `byoc_invite_claimed_${project.id}_${user.id}`,
        metadata: {
          project_id: project.id,
          client_id: user.id,
          byoc: true,
        },
      }),
      createSystemNotification({
        userId: user.id,
        message: `Private project "${project.title}" is now in your workspace. Review the scope and fund the first milestone to begin.`,
        type: "MILESTONE",
        href: `/command-center/${project.id}`,
        sourceKey: `byoc_invite_claimed_buyer_${project.id}_${user.id}`,
        metadata: {
          project_id: project.id,
          facilitator_id: project.creator_id,
          organization_id: clientOrganization?.id ?? null,
          byoc: true,
          next_action: "FUND_FIRST_MILESTONE",
        },
      }),
    ]);

    return NextResponse.redirect(new URL(`/command-center/${project.id}`, req.url));
  } catch(e) {
    console.error("BYOC invite claim failed:", e);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
