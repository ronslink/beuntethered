import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getDynamicAIProvider } from "@/lib/ai-router";

// Vercel deployment: max duration for server execution limits to 300 seconds extending complex LLM mapping time
export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
       return NextResponse.json({ error: "Valid contextual prompt required." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication logic missing." }, { status: 401 });

    const dynamicModel = await getDynamicAIProvider(user.id);

    // Connects formally securely mapping arrays dynamically bypassing raw openai constraints
    const { object } = await generateObject({
      model: dynamicModel, 
      system: "You are an elite Technical Product Manager. The user will describe a software project. Your job is to translate their raw idea into a highly structured Statement of Work (SoW) JSON. You must break the project into logical milestones. If the user does not provide a budget, estimate a realistic market rate for an elite US-based developer. If the user provides a prompt that is too vague to scope (e.g., 'Make me an app'), do your best to create a generic 3-phase discovery/build/launch scope so the UI doesn't break, but add a warning in the Executive Summary.",
      prompt: `Generate a formal Statement of Work based on the following engineering requirements:\n\n${prompt}`,
      schema: z.object({
        title: z.string().describe("Formal, elite sounding project title"),
        executiveSummary: z.string().describe("High-level, technical summary of the implementation goal and strategic roadmap."),
        milestones: z.array(z.object({
          title: z.string().describe("Name of the milestone phase"),
          description: z.string().describe("What specific deliverables are included in this drop"),
          amount: z.number().describe("Dollar value assigned securely mapping down to the phase")
        })).describe("The strictly priced breaking down of deliverables"),
        totalAmount: z.number().describe("The total cumulative cost sum of all milestones")
      }),
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
