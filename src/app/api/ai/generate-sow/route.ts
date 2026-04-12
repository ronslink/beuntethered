import { NextResponse } from "next/server";
import { generateText } from "ai";
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

    const schemaDescription = `Return a JSON object with exactly this structure:
{
  "title": "Formal project title",
  "executiveSummary": "High-level technical summary",
  "milestones": [
    {
      "title": "Phase name",
      "description": "Brief summary of this milestone phase",
      "deliverables": ["Feature 1 description", "Feature 2 description", "Feature 3 description"],
      "acceptance_criteria": "Strict binary rules for Escrow release",
      "estimated_duration_days": 14,
      "amount": 1500
    }
  ],
  "totalAmount": 4500
}
Each milestone MUST include a "deliverables" array with 3-6 specific, distinct features or tasks that will be built in that phase. Be granular — each deliverable should be a single concrete feature (e.g. "User authentication with OAuth2", "Dashboard analytics widget", "Stripe payment integration").
Return ONLY the JSON object. No markdown, no extra text.`;

    // Pass 2: The Structural Enforcer (generateText to handle <think> traces)
    const { text: rawPass2 } = await generateText({
      model: dynamicModel, 
      system: `You are an Elite Staff Engineer and Escrow Architect. I will provide a rough project outline. You must break these tasks down significantly further. Translate them into highly granular technical milestones, add strict acceptance_criteria for Escrow release, and apply lean MVP pricing ($500-$3000 per phase). ${schemaDescription}`,
      prompt: `Here is the rough outline to expand and format:\n\n${roughDraft}`,
    });

    // Strip <think> reasoning traces from M2.7 output
    let cleaned = rawPass2.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Strip markdown code fences
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    // Extract JSON object via brace detection
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
