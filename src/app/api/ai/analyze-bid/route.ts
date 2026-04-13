import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bidId, projectId, proposedAmount, estimatedDays, technicalApproach, proposedTechStack, proposedMilestones } = body;

    // Fetch the project SoW for context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const originalTotal = project.milestones.reduce((acc: number, m: any) => acc + Number(m.amount), 0);
    const originalDays = project.milestones.reduce((acc: number, m: any) => acc + (m.estimated_duration_days || 0), 0);

    // --- Scoring Logic (deterministic signals, no LLM required) ---

    // 1. Price fairness: within 25% of original budget = green, 25-50% = amber, >50% = red
    const priceDelta = originalTotal > 0 ? Math.abs(proposedAmount - originalTotal) / originalTotal : 0;
    const priceSignal = priceDelta < 0.25 ? "FAIR" : priceDelta < 0.5 ? "REVIEW" : "OUTLIER";
    const priceBand = originalTotal > 0
      ? { low: Math.round(originalTotal * 0.75), high: Math.round(originalTotal * 1.25) }
      : null;

    // 2. Timeline realism: within 30% of original = realistic
    const daysDelta = originalDays > 0 ? Math.abs(estimatedDays - originalDays) / originalDays : 0;
    const timelineSignal = originalDays === 0 ? "UNKNOWN" : daysDelta < 0.3 ? "REALISTIC" : daysDelta < 0.6 ? "TIGHT" : "UNREALISTIC";

    // 3. Stack compatibility: simple keyword scan of SoW vs proposed stack
    const sowText = project.ai_generated_sow.toLowerCase();
    let stackScore = 75; // default neutral
    if (proposedTechStack) {
      const stackKeywords = proposedTechStack.toLowerCase().split(/[,\s]+/).filter((k: string) => k.length > 2);
      const matches = stackKeywords.filter((kw: string) => sowText.includes(kw)).length;
      stackScore = stackKeywords.length > 0 ? Math.min(100, Math.round((matches / stackKeywords.length) * 100)) : 70;
    }

    // 4. Milestone completeness flags
    const flags: string[] = [];
    const ms = proposedMilestones || project.milestones;
    const msCount = ms?.length || 0;
    if (msCount === 0) flags.push("No milestones defined — high delivery risk.");
    if (msCount === 1 && proposedAmount > 5000) flags.push("Single milestone for a large project — consider splitting for client protection.");
    const hasQA = JSON.stringify(ms).toLowerCase().match(/\b(test|qa|quality)\b/);
    if (!hasQA) flags.push("No QA or testing milestone detected — bids with testing stages are accepted 38% more often.");
    if (proposedAmount < originalTotal * 0.5 && originalTotal > 0) flags.push("Proposed price is significantly below the client's budget — ensure deliverables aren't scoped down.");

    // 5. Overall recommendation
    let recommendation: "TOP_PICK" | "STRONG" | "REVIEW" | "CAUTION" = "STRONG";
    if (flags.length >= 3 || priceSignal === "OUTLIER" || timelineSignal === "UNREALISTIC") recommendation = "CAUTION";
    else if (flags.length === 0 && priceSignal === "FAIR" && timelineSignal === "REALISTIC" && stackScore >= 80) recommendation = "TOP_PICK";
    else if (flags.length >= 2 || priceSignal === "REVIEW") recommendation = "REVIEW";

    const scoreCard = {
      price: { signal: priceSignal, delta_pct: Math.round(priceDelta * 100), band: priceBand },
      timeline: { signal: timelineSignal, delta_pct: Math.round(daysDelta * 100) },
      stack_compatibility: stackScore,
      milestone_count: msCount,
      flags,
      recommendation,
      generated_at: new Date().toISOString(),
    };

    // Persist scorecard to Bid record
    await prisma.bid.update({
      where: { id: bidId },
      data: {
        ai_score_card: scoreCard,
        ai_translation_summary: `Stack compatibility ${stackScore}% · Price ${priceSignal.toLowerCase()} · Timeline ${timelineSignal.toLowerCase()}`,
      },
    });

    return NextResponse.json({ success: true, scoreCard });
  } catch (error: any) {
    console.error("AI analyze-bid fault:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
