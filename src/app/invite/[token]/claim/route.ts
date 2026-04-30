import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { createSystemNotification } from "@/lib/notifications";

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

    return NextResponse.redirect(new URL(`/projects/${project.id}`, req.url));
  } catch(e) {
    console.error("BYOC invite claim failed:", e);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
