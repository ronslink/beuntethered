import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { OpenAI } from "openai";

/**
 * Internal endpoint — called server-side (fire-and-forget) from `actions/dispute.ts`.
 * Generates an AI fact-finding report against the immutable Scope of Work and
 * writes it back to `dispute.ai_fact_finding_report` for the Arbitration Panel.
 *
 * No external authentication required — this route is called only from server
 * actions with a shared INTERNAL_API_SECRET header for basic SSRF protection.
 */
export async function POST(req: Request) {
  try {
    // Lightweight internal auth — prevent accidental public exposure
    const internalSecret = req.headers.get("x-internal-secret");
    if (
      process.env.INTERNAL_API_SECRET &&
      internalSecret !== process.env.INTERNAL_API_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      disputeId,
      reason,
      sowText,
      milestoneTitle,
      acceptanceCriteria,
    }: {
      disputeId: string;
      reason: string;
      sowText: string;
      milestoneTitle: string;
      acceptanceCriteria: string[];
    } = body;

    if (!disputeId || !reason || !sowText) {
      return NextResponse.json(
        { error: "Missing required fields: disputeId, reason, sowText" },
        { status: 400 }
      );
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

    const systemPrompt = `You are a neutral AI arbitration assistant for a software escrow platform called Untether.
Your role is to produce a concise, objective fact-finding report based solely on:
1. The immutable Scope of Work (SoW) locked at project creation
2. The milestone acceptance criteria
3. The client's dispute reason

Output a structured JSON object with this exact shape:
{
  "standing": "CLIENT" | "FACILITATOR" | "INCONCLUSIVE",
  "confidence": number (0-100),
  "summary": string (2-3 sentences, neutral, factual),
  "key_findings": string[] (2-4 bullet points of specific observations),
  "recommendation": string (one actionable sentence for the human arbiter)
}

Be strictly neutral. Do not favour either party without clear evidence from the SoW or criteria.`;

    const userPrompt = `--- LOCKED SCOPE OF WORK ---
${sowText}

--- MILESTONE: ${milestoneTitle} ---
ACCEPTANCE CRITERIA:
${criteriaBlock}

--- CLIENT DISPUTE REASON ---
${reason}

Analyse whether the dispute has standing against the Scope of Work.`;

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
          author: "Daktari Arbitration Engine",
        },
      });
    }

    return NextResponse.json({ success: true, report: parsed });
  } catch (error: any) {
    console.error("[dispute-analysis] Fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
