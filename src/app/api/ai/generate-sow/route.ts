import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Vercel deployment: max duration for Edge function execution limits to 60 seconds giving LLMs time
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
       return NextResponse.json({ error: "Valid contextual prompt required." }, { status: 400 });
    }

    // Connects formally to OpenAI securely generating precisely structured JSON arrays mapped to schemas
    const { object } = await generateObject({
      model: openai("gpt-4o"), 
      system: "You are an elite technical project manager handling Escrow deliverables. The user will give you a rough idea of a software project. You must break it down into a formal Statement of Work with logical, strictly priced milestones. Output ONLY valid JSON matching the schema.",
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
