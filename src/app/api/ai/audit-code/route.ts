import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { OpenAI } from "openai";
import { decryptApiKey } from "@/lib/encryption";
import { recordActivity } from "@/lib/activity";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { userCanAccessBuyerProject } from "@/lib/project-access";
import {
  AUDIT_ACCESS_DENIED,
  AUDIT_NOT_READY,
  AUDIT_PAYLOAD_MISMATCH,
  canAccessMilestoneAuditRequester,
  isAuditPayloadForMilestone,
  isMilestoneAuditReady,
} from "@/lib/audit-access";
import { auditCodeInputSchema } from "@/lib/validators";
import { notifyTrustEvent } from "@/lib/trust-notifications";

function hasInternalAccess(req: Request) {
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-internal-secret")?.trim();
  return Boolean(configuredSecret && providedSecret && configuredSecret === providedSecret);
}

async function refreshFacilitatorAuditScore(facilitatorId?: string | null) {
  if (!facilitatorId) return;

  const audits = await prisma.milestoneAudit.findMany({
    where: {
      milestone: { facilitator_id: facilitatorId },
    },
    select: { score: true },
  });
  const average = audits.length
    ? audits.reduce((acc, item) => acc + item.score, 0) / audits.length
    : 0;
  await prisma.user.update({
    where: { id: facilitatorId },
    data: { average_ai_audit_score: average },
  });
}

async function recordAuditFailure({
  milestoneId,
  payloadUrl,
  requesterId,
  reason,
  code,
}: {
  milestoneId: string;
  payloadUrl?: string | null;
  requesterId?: string | null;
  reason: string;
  code: string;
}) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });
  if (!milestone) return null;

  const rawResult = {
    code,
    error: reason,
    confidence_score: 0,
    is_passing: false,
    criteria_met: [],
    criteria_missed: [reason],
    generated_at: new Date().toISOString(),
  };

  const audit = await prisma.milestoneAudit.create({
    data: {
      milestone_id: milestone.id,
      project_id: milestone.project_id,
      requested_by_id: requesterId ?? milestone.facilitator_id ?? milestone.project.client_id ?? null,
      provider: "openai",
      model: "gpt-4o-mini",
      score: 0,
      is_passing: false,
      criteria_met: [],
      criteria_missed: [reason],
      summary: `Audit could not be completed: ${reason}`,
      raw_result: rawResult,
    },
  });

  const auditUploaderId = milestone.facilitator_id ?? milestone.project.client_id;
  if (payloadUrl && auditUploaderId) {
    await prisma.attachment.create({
      data: {
        uploader_id: auditUploaderId,
        project_id: milestone.project_id,
        milestone_id: milestone.id,
        audit_id: audit.id,
        name: "Audit attempt delivery artifact",
        url: payloadUrl,
        content_type: null,
        size_bytes: null,
        purpose: "AUDIT_EVIDENCE",
      },
    });
  }

  await prisma.timelineEvent.create({
    data: {
      project_id: milestone.project_id,
      milestone_id: milestone.id,
      type: "SYSTEM",
      status: "FAILED",
      description: `AI audit failed during execution: ${reason}`,
      author: "Untether Audit Engine",
    },
  });

  await recordActivity({
    projectId: milestone.project_id,
    actorId: requesterId ?? milestone.facilitator_id ?? null,
    milestoneId: milestone.id,
    action: "AUDIT_COMPLETED",
    entityType: "MilestoneAudit",
    entityId: audit.id,
    metadata: { score: 0, is_passing: false, code },
  });

  await Promise.all([
    notifyTrustEvent({
      userId: milestone.project.client_id,
      kind: "AUDIT_COMPLETED",
      projectId: milestone.project_id,
      projectTitle: milestone.project.title,
      actorRole: "SYSTEM",
      milestoneId: milestone.id,
      auditPassed: false,
      metadata: { audit_id: audit.id, score: 0, code },
    }),
    notifyTrustEvent({
      userId: milestone.facilitator_id,
      kind: "AUDIT_COMPLETED",
      projectId: milestone.project_id,
      projectTitle: milestone.project.title,
      actorRole: "SYSTEM",
      milestoneId: milestone.id,
      auditPassed: false,
      metadata: { audit_id: audit.id, score: 0, code },
    }),
  ]);

  await refreshFacilitatorAuditScore(milestone.facilitator_id);

  return audit;
}

export async function POST(req: Request) {
  let globalMilestoneId: string | undefined;
  let globalPayloadUrl: string | undefined;
  let globalRequesterId: string | null | undefined;
  try {
    const body = await req.json().catch(() => null);
    const parsedInput = auditCodeInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error: parsedInput.error.issues[0]?.message ?? "Provide a milestone and delivery artifact before requesting an audit.",
          code: "AUDIT_REQUEST_INVALID",
        },
        { status: 400 }
      );
    }

    const { milestone_id, payload_url, evidence_summary, agent_key } = parsedInput.data;
    void agent_key;
    globalMilestoneId = milestone_id;
    globalPayloadUrl = payload_url;

    // Load the milestone, project, and reviewer context for the audit.
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestone_id },
      include: {
        project: { include: { client: true } },
        facilitator: true
      }
    });

    if (!milestone) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

    const hasInternalAuditAccess = hasInternalAccess(req);
    let auditRequesterId = milestone.facilitator_id ?? milestone.project.client_id ?? null;

    if (!hasInternalAuditAccess) {
      const user = await getCurrentUser();
      const hasBuyerProjectAccess = user ? await userCanAccessBuyerProject(milestone.project_id, user.id) : false;
      const canAccess = canAccessMilestoneAuditRequester({
        isInternal: false,
        userId: user?.id,
        milestoneFacilitatorId: milestone.facilitator_id,
        hasBuyerProjectAccess,
      });

      if (!user || !canAccess) {
        return NextResponse.json({ error: AUDIT_ACCESS_DENIED, code: "AUDIT_ACCESS_DENIED" }, { status: 403 });
      }

      auditRequesterId = user.id;
    }
    globalRequesterId = auditRequesterId;

    if (!isMilestoneAuditReady(milestone.status)) {
      return NextResponse.json({ error: AUDIT_NOT_READY, code: "AUDIT_NOT_READY" }, { status: 409 });
    }

    if (!isAuditPayloadForMilestone({
      payloadUrl: payload_url,
      livePreviewUrl: milestone.live_preview_url,
      payloadStoragePath: milestone.payload_storage_path,
    })) {
      return NextResponse.json({ error: AUDIT_PAYLOAD_MISMATCH, code: "AUDIT_PAYLOAD_MISMATCH" }, { status: 400 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("ai.audit-code", String(milestone_id)),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!milestone.project.client || !milestone.project.client.openai_key_encrypted) {
       await recordAuditFailure({
         milestoneId: milestone.id,
         payloadUrl: payload_url,
         requesterId: auditRequesterId,
         reason: "Client AI key is not configured for audit automation.",
         code: "AUDIT_KEY_MISSING",
       });
       return NextResponse.json({ error: "Client AI key is not configured for audit automation." }, { status: 400 });
    }

    // Construct the Auditor Pipeline
    const openai = new OpenAI({ apiKey: decryptApiKey(milestone.project.client.openai_key_encrypted) });
    const criteriaString = milestone.acceptance_criteria.length > 0 
      ? milestone.acceptance_criteria.join("\n") 
      : "No hard limits defined.";

    const systemPrompt = `You are a strict, enterprise-grade Code Auditing Intelligence.
Your singular objective is to evaluate the provided codebase/payload against the hard Milestone Acceptance Criteria.
You must output exclusively a valid JSON object matching this exact interface:
{
  "confidence_score": number (0 to 100),
  "is_passing": boolean (true if score > 80),
  "criteria_met": string[] (specific acceptance criteria that appear satisfied),
  "criteria_missed": string[] (specific acceptance criteria that are missing or weak),
  "critical_failures": string[] (empty if passing),
  "justification": string (brief analytical summary)
}`;

    const evidenceSummary =
      typeof evidence_summary === "string" && evidence_summary.trim().length > 0
        ? evidence_summary.trim()
        : "No facilitator evidence summary supplied.";

    const userPrompt = `[ACCEPTANCE CRITERIA]\n${criteriaString}\n\n[FACILITATOR EVIDENCE SUMMARY]\n${evidenceSummary}\n\n[PAYLOAD URL / COMMIT LOG]\n${payload_url}\n\nAnalyze this delivery against the acceptance criteria. Does it satisfy the milestone requirements?`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const output = response.choices[0].message.content;
    if (!output) throw new Error("AI audit returned an empty response.");

    const parsedAudit = JSON.parse(output);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsedAudit.confidence_score) || 0)));
    const isPassing = Boolean(parsedAudit.is_passing);

    const audit = await prisma.milestoneAudit.create({
      data: {
        milestone_id: milestone.id,
        project_id: milestone.project_id,
        requested_by_id: auditRequesterId,
        provider: "openai",
        model: "gpt-4o-mini",
        score,
        is_passing: isPassing,
        criteria_met: Array.isArray(parsedAudit.criteria_met) ? parsedAudit.criteria_met : [],
        criteria_missed: Array.isArray(parsedAudit.criteria_missed)
          ? parsedAudit.criteria_missed
          : Array.isArray(parsedAudit.critical_failures)
            ? parsedAudit.critical_failures
            : [],
        summary: typeof parsedAudit.justification === "string" ? parsedAudit.justification : "Audit completed.",
        raw_result: parsedAudit,
      },
    });

    const auditUploaderId = milestone.facilitator_id ?? milestone.project.client_id;
    if (auditUploaderId) {
      await prisma.attachment.create({
        data: {
          uploader_id: auditUploaderId,
          project_id: milestone.project_id,
          milestone_id: milestone.id,
          audit_id: audit.id,
          name: "Audited delivery artifact",
          url: payload_url,
          content_type: null,
          size_bytes: null,
          purpose: "AUDIT_EVIDENCE",
        },
      });
    }

    // Seed proof of work
    await prisma.timelineEvent.create({
      data: {
         project_id: milestone.project_id,
         milestone_id: milestone.id,
         type: "SYSTEM",
         status: isPassing ? "SUCCESS" : "FAILED",
         description: `AI Audit Result: ${isPassing ? 'Passed' : 'Failed'} with confidence ${score}%`,
         author: "Untether Audit Engine"
      }
    });

    await recordActivity({
      projectId: milestone.project_id,
      actorId: auditRequesterId ?? milestone.facilitator_id ?? null,
      milestoneId: milestone.id,
      action: "AUDIT_COMPLETED",
      entityType: "MilestoneAudit",
      entityId: audit.id,
      metadata: { score, is_passing: isPassing },
    });

    await Promise.all([
      notifyTrustEvent({
        userId: milestone.project.client_id,
        kind: "AUDIT_COMPLETED",
        projectId: milestone.project_id,
        projectTitle: milestone.project.title,
        actorRole: "SYSTEM",
        milestoneId: milestone.id,
        auditPassed: isPassing,
        metadata: { audit_id: audit.id, score, is_passing: isPassing },
      }),
      notifyTrustEvent({
        userId: milestone.facilitator_id,
        kind: "AUDIT_COMPLETED",
        projectId: milestone.project_id,
        projectTitle: milestone.project.title,
        actorRole: "SYSTEM",
        milestoneId: milestone.id,
        auditPassed: isPassing,
        metadata: { audit_id: audit.id, score, is_passing: isPassing },
      }),
    ]);

    await refreshFacilitatorAuditScore(milestone.facilitator_id);

    return NextResponse.json({ success: true, audit: { ...parsedAudit, id: audit.id, confidence_score: score } });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("AI Auditor Fault:", error);
    
    // Attempt to write a durable audit failure so the UI doesn't collapse back to timeline-only evidence.
    try {
      if (globalMilestoneId) {
        await recordAuditFailure({
          milestoneId: globalMilestoneId,
          payloadUrl: globalPayloadUrl,
          requesterId: globalRequesterId,
          reason: error.message || "Unknown error",
          code: "AUDIT_EXECUTION_FAILED",
        });
      }
    } catch (fallbackErr) {
      console.error("Fallback audit record write failed:", fallbackErr);
    }

    return NextResponse.json({ error: "AI audit failed. Please retry or review manually." }, { status: 500 });
  }
}
