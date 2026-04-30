import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { userCanManageBuyerProject } from "@/lib/project-access";
import { buildBidScoreCard, parseBidMilestones, summarizeBidScoreCard } from "@/lib/bid-analysis";
import { bidAnalysisInputSchema } from "@/lib/validators";

function hasInternalAccess(req: Request) {
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-internal-secret")?.trim();
  return Boolean(configuredSecret && providedSecret && configuredSecret === providedSecret);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsedInput = bidAnalysisInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: "Submit a bidId to analyze.", code: "INVALID_BID_ANALYSIS_REQUEST" },
        { status: 400 }
      );
    }
    const { bidId } = parsedInput.data;

    await assertDurableRateLimit({
      key: rateLimitKey("ai.analyze-bid", bidId),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: { include: { milestones: true } } },
    });
    if (!bid) return NextResponse.json({ error: "Bid not found.", code: "BID_NOT_FOUND" }, { status: 404 });

    if (!hasInternalAccess(req)) {
      const user = await getCurrentUser();
      const isBidOwner = user?.id === bid.developer_id;
      const isBuyerManager = user ? await userCanManageBuyerProject(bid.project_id, user.id) : false;
      if (!user || (!isBidOwner && !isBuyerManager)) {
        return NextResponse.json(
          { error: "Bid analysis access denied.", code: "BID_ANALYSIS_ACCESS_DENIED" },
          { status: 403 }
        );
      }
    }

    const scoreCard = buildBidScoreCard({
      project: bid.project,
      proposedAmount: Number(bid.proposed_amount),
      estimatedDays: bid.estimated_days,
      technicalApproach: bid.technical_approach,
      proposedTechStack: bid.proposed_tech_stack,
      proposedMilestones: parseBidMilestones(bid.proposed_milestones),
    });

    await prisma.bid.update({
      where: { id: bid.id },
      data: {
        ai_score_card: scoreCard,
        ai_translation_summary: summarizeBidScoreCard(scoreCard),
      },
    });

    return NextResponse.json({ success: true, scoreCard });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("AI analyze-bid fault:", error);
    return NextResponse.json({ error: "Unable to analyze bid.", code: "BID_ANALYSIS_FAILED" }, { status: 500 });
  }
}
