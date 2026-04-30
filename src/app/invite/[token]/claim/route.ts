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
      where: { invite_token: params.token }
    });

    if (!project || project.status !== "DRAFT" || !project.is_byoc) {
       // Prevent dual-claims mapping to null
       return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        client_id: user.id,
        status: "ACTIVE",
        invite_token: null
      }
    });

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
    ]);

    return NextResponse.redirect(new URL(`/projects/${project.id}`, req.url));
  } catch(e) {
    console.error("BYOC invite claim failed:", e);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
