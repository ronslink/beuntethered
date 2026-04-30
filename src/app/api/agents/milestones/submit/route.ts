import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { canSubmitMilestone } from "@/lib/milestone-state";
import { agentMilestoneSubmissionInputSchema } from "@/lib/validators";
import { agentApiError, hashAgentToken, readAgentBearerToken } from "@/lib/agent-api";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { notifyTrustEvent } from "@/lib/trust-notifications";

export async function POST(req: Request) {
  try {
    const tokenResult = readAgentBearerToken(req);
    if (!tokenResult.ok) return agentApiError(tokenResult);

    const facilitator = await prisma.user.findFirst({
      where: {
        agent_key_hash: hashAgentToken(tokenResult.token),
        role: "FACILITATOR",
      },
      select: { id: true, name: true },
    });

    if (!facilitator) {
      return agentApiError({
        error: "Automation API key is invalid or not bound to a facilitator account.",
        code: "AGENT_AUTH_DENIED",
        status: 401,
      });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("agent.milestone-submit", facilitator.id),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    // 3. Payload Integrity
    const body = await req.json();
    const parsed = agentMilestoneSubmissionInputSchema.safeParse({
      milestoneId: body.milestone_id,
      previewUrl: body.preview_url ?? body.live_preview_url,
      payloadStoragePath: body.payload_storage_path,
      evidenceSummary: body.evidence_summary ?? body.evidenceSummary,
    });

    if (!parsed.success) {
      return agentApiError({
        error: "Submit milestone_id, preview_url, payload_storage_path, and evidence_summary.",
        code: "AGENT_REQUEST_INVALID",
        status: 400,
      });
    }

    const { milestoneId, previewUrl, payloadStoragePath, evidenceSummary } = parsed.data;

    // 4. Milestone Assignment Integrity Check
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone) {
      return agentApiError({
        error: "Milestone not found.",
        code: "AGENT_MILESTONE_NOT_FOUND",
        status: 404,
      });
    }

    if (milestone.facilitator_id !== facilitator.id) {
       return agentApiError({
         error: "Automation token does not own this milestone.",
         code: "AGENT_MILESTONE_FORBIDDEN",
         status: 403,
       });
    }

    if (!canSubmitMilestone(milestone.status)) {
       return agentApiError({
         error: "Milestone must be funded in escrow before delivery can be submitted.",
         code: "AGENT_MILESTONE_NOT_SUBMITTABLE",
         status: 409,
       });
    }

    // 5. Atomic Native Execution
    const submitted = await prisma.milestone.updateMany({
      where: { id: milestone.id, facilitator_id: facilitator.id, status: "FUNDED_IN_ESCROW" },
      data: {
        status: "SUBMITTED_FOR_REVIEW",
        live_preview_url: previewUrl,
        payload_storage_path: payloadStoragePath,
      },
    });

    if (submitted.count === 0) {
      return agentApiError({
        error: "Milestone state changed before submission completed.",
        code: "AGENT_MILESTONE_CONFLICT",
        status: 409,
      });
    }

    await prisma.timelineEvent.create({
      data: {
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        type: "SYSTEM",
        description: `AI-assisted workflow submitted milestone proof on behalf of ${facilitator.name || "Facilitator"}: ${evidenceSummary.slice(0, 240)}`,
        status: "SUCCESS",
        author: "Delivery Automation",
      },
    });

    await prisma.attachment.create({
      data: {
        uploader_id: facilitator.id,
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        name: "Delivery automation artifact",
        url: payloadStoragePath,
        content_type: null,
        size_bytes: null,
        purpose: "MILESTONE_SUBMISSION",
      },
    });

    await recordActivity({
      projectId: milestone.project_id,
      actorId: facilitator.id,
      milestoneId: milestone.id,
      action: "MILESTONE_SUBMITTED",
      entityType: "Milestone",
      entityId: milestone.id,
      metadata: {
        preview_url: previewUrl,
        submitted_by: "agent",
        has_payload: true,
        evidence_summary: evidenceSummary,
      },
    });

    await notifyTrustEvent({
      userId: milestone.project.client_id,
      kind: "MILESTONE_SUBMITTED",
      projectId: milestone.project_id,
      projectTitle: milestone.project.title,
      actorRole: "FACILITATOR",
      milestoneId: milestone.id,
      metadata: {
        milestone_id: milestone.id,
        facilitator_id: facilitator.id,
        submitted_by: "agent",
      },
    });

    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3200";
    fetch(`${baseUrl}/api/ai/audit-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalSecret ? { "x-internal-secret": internalSecret } : {}),
      },
      body: JSON.stringify({
        milestone_id: milestone.id,
        payload_url: previewUrl,
        evidence_summary: evidenceSummary,
      }),
    }).catch((err) => console.error("[agent milestone submit] AI audit failed:", err));

    revalidatePath("/command-center");
    revalidatePath(`/command-center/${milestone.project_id}`);
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/marketplace/project/${milestone.project_id}`);

    return NextResponse.json({ success: true, message: "Milestone submitted for review." });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Headless Bot API Error:", error);
    return agentApiError({ error: "Unable to submit milestone.", code: "AGENT_API_FAILED", status: 500 });
  }
}
