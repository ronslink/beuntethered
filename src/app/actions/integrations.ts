"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { encryptApiKey } from "@/lib/encryption";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { projectEvidenceSourceInputSchema, projectRepositoryInputSchema } from "@/lib/validators";

async function getEvidenceManageableProject(projectId: string, user: { id: string; role: string }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { select: { facilitator_id: true } },
      organization: {
        select: {
          members: {
            where: { user_id: user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!project) throw new Error("Project not found.");

  const isFacilitator = user.role === "FACILITATOR" && project.milestones.some((milestone) => milestone.facilitator_id === user.id);
  const isClient =
    user.role === "CLIENT" &&
    (project.client_id === user.id || project.creator_id === user.id || (project.organization?.members.length ?? 0) > 0);

  if (!isFacilitator && !isClient) {
    throw new Error("You do not have permission to manage evidence sources for this project.");
  }

  return { project, isFacilitator, isClient };
}

function getEvidenceSourceOwnershipHint(type: string) {
  switch (type) {
    case "DOMAIN":
      return "Use DNS TXT or .well-known file verification. Do not share registrar passwords.";
    case "SUPABASE":
      return "Attach migration/schema evidence. Do not share service-role keys in messages.";
    case "VERCEL":
      return "Connect deployment URL and commit mapping before milestone approval.";
    case "NETLIFY":
      return "Attach deploy preview or production URL with deploy/build status. Do not share account tokens.";
    case "CLOUDFLARE":
      return "Attach Pages/Worker route, deployment status, or DNS evidence. Do not share API tokens.";
    case "RAILWAY":
      return "Attach service/deployment URL, logs, and environment mapping. Do not share secrets.";
    case "RENDER":
      return "Attach service URL, deploy event, health check, or worker/cron run evidence. Do not share secrets.";
    case "FLY":
      return "Attach app URL, deployment ID, machine/region status, or health check evidence. Do not share tokens.";
    case "DIGITALOCEAN":
      return "Attach App Platform URL, deployment log, component status, or managed database evidence. Do not share API tokens.";
    case "HEROKU":
      return "Attach review app URL, release version, dyno/process status, or pipeline evidence. Do not share API keys.";
    default:
      return "Attach this source to the relevant milestone evidence packet.";
  }
}

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

    const existingSource = await prisma.projectEvidenceSource.findFirst({
      where: {
        project_id: data.projectId,
        type: "GITHUB",
        url: formattedUrl,
      },
      select: { id: true },
    });

    const sourceData = {
      label: "GitHub repository",
      url: formattedUrl,
      status: "CONNECTED" as const,
      metadata: {
        proof_use: "Repository, branch, commit, pull request, and automated check evidence.",
        access: data.token ? "read_only_token_saved" : "public_or_previously_connected",
      },
    };

    if (existingSource) {
      await prisma.projectEvidenceSource.update({
        where: { id: existingSource.id },
        data: sourceData,
      });
    } else {
      await prisma.projectEvidenceSource.create({
        data: {
          ...sourceData,
          project_id: data.projectId,
          created_by_id: user.id,
          type: "GITHUB",
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        project_id: data.projectId,
        actor_id: user.id,
        action: "SYSTEM_EVENT",
        entity_type: "ProjectEvidenceSource",
        entity_id: data.projectId,
        metadata: {
          source_type: "GITHUB",
          source_url: formattedUrl,
          event: "github_repository_linked",
        },
      },
    });

    revalidatePath("/command-center");
    revalidatePath(`/command-center/${data.projectId}`);
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message };
  }
}

export async function saveProjectEvidenceSource(input: unknown) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Sign in before adding evidence sources.");

    await assertDurableRateLimit({
      key: rateLimitKey("integration.evidence-source.save", user.id),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    const parsed = projectEvidenceSourceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Check the evidence source details and try again.",
      };
    }

    const data = parsed.data;
    const { isFacilitator } = await getEvidenceManageableProject(data.projectId, user);
    const cleanUrl = data.url ? data.url.replace(/\/$/, "") : null;

    await prisma.projectEvidenceSource.create({
      data: {
        project_id: data.projectId,
        created_by_id: user.id,
        type: data.type,
        label: data.label,
        url: cleanUrl,
        status: data.type === "OTHER" ? "CONNECTED" : "PENDING_VERIFICATION",
        metadata: {
          verification_note: data.verificationNote || null,
          submitted_by_role: user.role,
          ownership_hint: getEvidenceSourceOwnershipHint(data.type),
          facilitator_submitted: isFacilitator,
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        project_id: data.projectId,
        actor_id: user.id,
        action: "SYSTEM_EVENT",
        entity_type: "ProjectEvidenceSource",
        entity_id: data.projectId,
        metadata: {
          source_type: data.type,
          source_url: cleanUrl,
          event: "evidence_source_added",
        },
      },
    });

    revalidatePath(`/command-center/${data.projectId}`);
    return { success: true };
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error.message || "Evidence source could not be saved." };
  }
}
