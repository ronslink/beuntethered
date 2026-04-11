import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { getDynamicAIProvider } from "@/lib/ai-router";
import { generateObject } from "ai";
import { fetchGitHubDiff } from "@/lib/github";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized Network Check");

    const { timeEntryId } = await req.json();

    const timeEntry = await prisma.timeEntry.findUnique({
       where: { id: timeEntryId },
       include: { 
          milestone: {
             include: { project: true }
          }
       }
    });

    if (!timeEntry || timeEntry.milestone.project.client_id !== user.id) {
       return NextResponse.json({ error: "Invalid Escrow Validation." }, { status: 400 });
    }

    if (!timeEntry.proof_url) {
       return NextResponse.json({ error: "No Proof URL natively mapped for extraction." }, { status: 400 });
    }

    const targetUrl = timeEntry.proof_url;
    const token = timeEntry.milestone.project.github_access_token || undefined;

    // Phase 1: Retrieve Architectural Diff Constraints
    const gitRequest = await fetchGitHubDiff(targetUrl, token);
    
    if (!gitRequest.success || !gitRequest.diff) {
       return NextResponse.json({ error: gitRequest.error || "Execution Diff empty." }, { status: 400 });
    }

    // Phase 2: Route through Polymorphic BYOK Model Map
    const modelTarget = await getDynamicAIProvider(user.id);

    const systemPrompt = `You are an Elite Technical Auditor reviewing an untethered developer's Proof of Work.
You must review the provided git .diff files, the Developer's Proof description, and the Escrow Milestone requirement clearly.
Translate the explicit technical code adjustments logically into plain-English structure for a non-technical stakeholder to execute secure financial decisions on.
Explain what was built. Verify the math of their code footprint. Check for boilerplate loops or suspiciously vacuous code payloads relative to their logged hours.`;

    const userPayload = `
    --- ESCROW MILESTONE PHASE ---
    Title: ${timeEntry.milestone.title}
    Hours Logged Objectively: ${Number(timeEntry.hours)}
    
    --- DEVELOPER'S REASONING ---
    ${timeEntry.proof_description}

    --- SECURE GIT .DIFF PAYLOAD ---
    ${gitRequest.diff.substring(0, 15000)} // Bound memory buffers aggressively
    `;

    // Phase 3: Zod Enforced Mathematical Output Parsing
    const { object } = await generateObject({
       model: modelTarget,
       schema: z.object({
          summary: z.string().describe("A plain-English paragraph explicitly explaining the concrete mathematical code updates to a non-technical client."),
          alignment_score: z.number().min(1).max(100).describe("1-100 numerical score dictating how explicitly aligned the raw .diff payload is to the Milestone requirement."),
          red_flags: z.array(z.string()).describe("A strict array of strings containing technical warnings (e.g. suspiciously low modification array, no tests, mostly boilerplate generator dumps, empty loops).")
       }),
       system: systemPrompt,
       prompt: userPayload
    });

    // Phase 4: Bind JSON natively to TimeEntry
    await prisma.timeEntry.update({
       where: { id: timeEntryId },
       data: { ai_audit_report: object }
    });

    return NextResponse.json({ success: true, audit: object });
  } catch (error: any) {
    console.error("AI Audit Pipeline Failed:", error);
    return NextResponse.json({ error: error.message || "Failed AI compilation." }, { status: 500 });
  }
}
