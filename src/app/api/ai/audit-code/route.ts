import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { OpenAI } from "openai";
import { decryptApiKey } from "@/lib/encryption";

export async function POST(req: Request) {
  let globalMilestoneId: string | undefined;
  try {
    const body = await req.json();
    const { milestone_id, payload_url, agent_key } = body;
    globalMilestoneId = milestone_id;

    if (!milestone_id || !payload_url) {
      return NextResponse.json({ error: "Missing physical ingestion bounds." }, { status: 400 });
    }

    // Natively extract Milestone bounds
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestone_id },
      include: {
        project: { include: { client: true } },
        facilitator: true
      }
    });

    if (!milestone) return NextResponse.json({ error: "Milestone isolated out of bounds." }, { status: 404 });
    if (!milestone.project.client || !milestone.project.client.openai_key_encrypted) {
       return NextResponse.json({ error: "Client AI Key not actively bound for autonomous execution." }, { status: 400 });
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
  "critical_failures": string[] (empty if passing),
  "justification": string (brief analytical summary)
}`;

    const userPrompt = `[ACCEPTANCE CRITERIA]\n${criteriaString}\n\n[PAYLOAD URL / COMMIT LOG]\n${payload_url}\n\nAnalyze the structural implications of this payload. Does it physically accomplish the Acceptance Criteria?`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const output = response.choices[0].message.content;
    if (!output) throw new Error("AI core returned empty payload.");

    const parsedAudit = JSON.parse(output);

    // Seed proof of work
    await prisma.timelineEvent.create({
      data: {
         project_id: milestone.project_id,
         milestone_id: milestone.id,
         type: "SYSTEM",
         status: parsedAudit.is_passing ? "SUCCESS" : "FAILED",
         description: `AI Audit Result: ${parsedAudit.is_passing ? 'Passed' : 'Failed'} with confidence ${parsedAudit.confidence_score}%`,
         author: "Daktari Orchestrator"
      }
    });

    return NextResponse.json({ success: true, audit: parsedAudit });
  } catch (error: any) {
    console.error("AI Auditor Fault:", error);
    
    // Attempt to write a fallback failure to the timeline so the UI doesn't hang in PENDING
    try {
      if (globalMilestoneId) {
        const ms = await prisma.milestone.findUnique({ where: { id: globalMilestoneId } });
        if (ms) {
          await prisma.timelineEvent.create({
            data: {
               project_id: ms.project_id,
               milestone_id: ms.id,
               type: "SYSTEM",
               status: "FAILED",
               description: `AI Audit crashed during execution: ${error.message || "Unknown error"}`,
               author: "Daktari Orchestrator"
            }
          });
        }
      }
    } catch (fallbackErr) {
      console.error("Fallback timeline write failed:", fallbackErr);
    }

    return NextResponse.json({ error: "Execution matrix failure" }, { status: 500 });
  }
}
