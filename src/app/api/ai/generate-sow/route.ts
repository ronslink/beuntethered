import { NextResponse } from "next/server";
import { generateText, streamObject } from "ai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getDynamicAIProvider } from "@/lib/ai-router";

// Vercel deployment: max duration for server execution limits to 300 seconds extending complex LLM mapping time
export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const { prompt, mode } = await req.json();

    if (!prompt) {
       return NextResponse.json({ error: "Valid contextual prompt required." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication logic missing." }, { status: 401 });

    const dynamicModel = await getDynamicAIProvider(user.id);

    // Branching Logic for DISCOVERY mode mapping
    const isDiscovery = mode === 'DISCOVERY';
    const drafterPrompt = isDiscovery 
       ? `The user wants to explore a project idea: ${prompt}. Write a highly focused, single exactly $1,000 "Technical Architecture Blueprint" milestone. Do not draft a full application scope, strictly lock it to a discovery/architecture phase only.`
       : `The user wants to build: ${prompt}. Write a rough, 3-phase project outline. Focus only on high-level features.`;

    // Pass 1: The Raw Drafter (Fast & Cheap)
    const { text: roughDraft } = await generateText({
      model: dynamicModel, 
      system: "You are a Technical Product Manager.",
      prompt: drafterPrompt,
    });

    const SOWSchema = z.object({
      title: z.string().describe("Formal, elite sounding project title"),
      executiveSummary: z.string().describe("High-level, technical summary of the implementation goal and strategic roadmap."),
      milestones: z.array(z.object({
        title: z.string().describe("Name of the milestone phase"),
        description: z.string().describe("What specific deliverables are included in this drop"),
        acceptance_criteria: z.string().describe("Strict binary rules that must be met to trigger Escrow release"),
        amount: z.number().describe("Dollar value assigned securely mapping down to the phase")
      })).describe("The strictly priced breaking down of deliverables"),
      totalAmount: z.number().describe("The total cumulative cost sum of all milestones")
    });

    // Pass 2: The Structural Enforcer (Strict JSON Stream)
    const result = await streamObject({
      model: dynamicModel, 
      system: "You are an Elite Staff Engineer and Escrow Architect. I will provide a rough project outline. You must break these tasks down significantly further. Translate them into highly granular technical milestones, add strict `acceptance_criteria` for Escrow release, and apply lean MVP pricing ($500-$3000 per phase).",
      prompt: `Here is the rough outline to expand and format: ${roughDraft}`,
      schema: SOWSchema,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
