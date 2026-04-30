import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { OpenAI } from "openai";
import { requireInternalRequest } from "@/lib/internal-auth";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { disputeAnalysisInputSchema } from "@/lib/validators";

/**
 * Internal endpoint — called server-side (fire-and-forget) from `actions/dispute.ts`.
 * Generates an AI fact-finding report against the immutable Scope of Work and
 * writes it back to `dispute.ai_fact_finding_report` for the Arbitration Panel.
 *
 * Server-only endpoint. Production requires a shared INTERNAL_API_SECRET header;
 * local development may fall back when the secret is not configured.
 */
export async function POST(req: Request) {
  try {
    const auth = requireInternalRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message, code: auth.code }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsedInput = disputeAnalysisInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error: parsedInput.error.issues[0]?.message ?? "Provide dispute context before requesting analysis.",
          code: "DISPUTE_ANALYSIS_REQUEST_INVALID",
        },
        { status: 400 }
      );
    }
    const {
      disputeId,
      reason,
      sowText,
      milestoneTitle,
      acceptanceCriteria,
      evidenceUrls,
      disputeEvidence,
      deliveryEvidenceContext,
    } = parsedInput.data;

    await assertDurableRateLimit({
      key: rateLimitKey("ai.dispute-analysis", disputeId),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    const disputeExists = await prisma.dispute.findUnique({
      where: { id: disputeId },
      select: { id: true },
    });
    if (!disputeExists) {
      return NextResponse.json({ error: "Dispute not found.", code: "DISPUTE_NOT_FOUND" }, { status: 404 });
    }

    // Resolve the OpenAI key — prefer platform key, fall back gracefully
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.PLATFORM_OPENAI_KEY;

    if (!apiKey) {
      console.warn("[dispute-analysis] No OpenAI key configured — skipping AI fact-finding.");
      return NextResponse.json({ success: false, reason: "No AI key configured" });
    }

    const openai = new OpenAI({ apiKey });

    const criteriaBlock =
      acceptanceCriteria && acceptanceCriteria.length > 0
        ? acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")
        : "No explicit acceptance criteria were defined for this milestone.";
    const evidenceBlock =
      disputeEvidence && disputeEvidence.length > 0
        ? disputeEvidence
            .map((item, i) => `${i + 1}. ${item.name || "Evidence"}${item.url ? ` (${item.url})` : ""}`)
            .join("\n")
        : evidenceUrls && evidenceUrls.length > 0
          ? evidenceUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")
          : "No client-uploaded dispute evidence was provided.";
    const deliveryContextBlock = deliveryEvidenceContext
      ? JSON.stringify(deliveryEvidenceContext, null, 2)
      : "No delivery evidence context was provided.";

    const systemPrompt = `You are a neutral AI arbitration assistant for a software escrow platform called Untether.
Your role is to produce a concise, objective fact-finding report based solely on:
1. The immutable Scope of Work (SoW) locked at project creation
2. The milestone acceptance criteria
3. The milestone proof contract and submitted delivery evidence
4. The latest delivery audit, if available
5. The client's dispute reason and uploaded dispute evidence

Output a structured JSON object with this exact shape:
{
  "standing": "CLIENT" | "FACILITATOR" | "INCONCLUSIVE",
  "confidence": number (0-100),
  "summary": string (2-3 sentences, neutral, factual),
  "key_findings": string[] (2-4 bullet points of specific observations),
  "reviewed_artifacts": string[] (artifact names or evidence categories reviewed),
  "evidence_gaps": string[] (missing artifacts, unclear proof, or unresolved checks),
  "recommendation": string (one actionable sentence for the human arbiter)
}

Be strictly neutral. Do not favour either party without clear evidence from the SoW, criteria, proof contract, audit record, or uploaded evidence.`;

    const userPrompt = `--- LOCKED SCOPE OF WORK ---
${sowText}

--- MILESTONE: ${milestoneTitle} ---
ACCEPTANCE CRITERIA:
${criteriaBlock}

--- DELIVERY EVIDENCE CONTEXT ---
${deliveryContextBlock}

--- CLIENT-UPLOADED DISPUTE EVIDENCE ---
${evidenceBlock}

--- CLIENT DISPUTE REASON ---
${reason}

Analyse whether the dispute has standing against the Scope of Work and milestone proof contract.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistent, factual output
    });

    const raw = response.choices[0].message.content;
    if (!raw) throw new Error("AI returned empty response");

    const parsed = JSON.parse(raw);

    // Persist the report onto the Dispute record
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        ai_fact_finding_report: JSON.stringify(parsed, null, 2),
      },
    });

    // Log the analysis as a Timeline Event
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      select: { project_id: true, milestone_id: true },
    });

    if (dispute) {
      await prisma.timelineEvent.create({
        data: {
          project_id: dispute.project_id,
          milestone_id: dispute.milestone_id,
          type: "SYSTEM",
          status: parsed.standing === "FACILITATOR" ? "SUCCESS" : parsed.standing === "CLIENT" ? "FAILED" : "SUCCESS",
          description: `AI Fact-Finding: ${parsed.standing} standing · ${parsed.confidence}% confidence · ${parsed.summary}`,
          author: "Untether Arbitration Engine",
        },
      });
    }

    return NextResponse.json({ success: true, report: parsed });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("[dispute-analysis] Fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
