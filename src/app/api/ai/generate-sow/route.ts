import { NextResponse } from "next/server";
import { generateText } from "ai";
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

    const SOWSchema = {
      title: "Formal, elite sounding project title",
      executiveSummary: "High-level, technical summary of the implementation goal and strategic roadmap.",
      milestones: [{
        title: "Name of the milestone phase",
        description: "What specific deliverables are included in this drop",
        amount: "Numeric dollar value assigned securely mapping down to the phase (e.g. 5000)"
      }],
      totalAmount: "Numeric total cumulative cost sum of all milestones (e.g. 5000)"
    };

    const { text } = await generateText({
      model: dynamicModel, 
      system: "You are an elite Technical Product Manager. The user will describe a software project. Your job is to translate their raw idea into a highly structured Statement of Work (SoW) JSON. You must break the project into logical milestones. If the user does not provide a budget, estimate a realistic market rate for an elite US-based developer. If the user provides a prompt that is too vague to scope (e.g., 'Make me an app'), do your best to create a generic 3-phase discovery/build/launch scope so the UI doesn't break, but add a warning in the Executive Summary. Return ONLY valid JSON matching exactly the requested structure without any extra markdown.",
      prompt: `Generate a formal Statement of Work JSON exactly conforming to this architectural schema:\n${JSON.stringify(SOWSchema, null, 2)}\n\nBased on the following engineering requirements:\n\n${prompt}`,
    });

    // Strip all thinking nodes completely bypassing reasoning models limits natively
    let rawJson = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (rawJson.startsWith('```json')) {
      rawJson = rawJson.replace(/^```json\n/, '').replace(/\n```$/, '').trim();
    } else if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```\n/, '').replace(/\n```$/, '').trim();
    }
    
    // Fallback extraction natively using brace detection bound architecture
    const jsonStart = rawJson.indexOf('{');
    const jsonEnd = rawJson.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       rawJson = rawJson.substring(jsonStart, jsonEnd + 1);
    }

    const object = JSON.parse(rawJson);

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
