import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { agentApiError, hashAgentToken, readAgentBearerToken } from "@/lib/agent-api";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const tokenResult = readAgentBearerToken(req);
    if (!tokenResult.ok) return agentApiError(tokenResult);

    const facilitator = await prisma.user.findFirst({
      where: {
        agent_key_hash: hashAgentToken(tokenResult.token),
        role: "FACILITATOR",
      },
      select: { id: true },
    });

    if (!facilitator) {
      return agentApiError({
        error: "Automation API key is invalid or not bound to a facilitator account.",
        code: "AGENT_AUTH_DENIED",
        status: 401,
      });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("agent.projects", facilitator.id),
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    const url = new URL(req.url);
    const specificProjectId = url.searchParams.get("id");

    if (specificProjectId) {
      const project = await prisma.project.findUnique({
        where: { id: specificProjectId, status: "OPEN_BIDDING" },
        include: { milestones: true },
      });

      if (!project) {
        return agentApiError({
          error: "Project not found or no longer open for bidding.",
          code: "AGENT_PROJECT_NOT_FOUND",
          status: 404,
        });
      }

      return NextResponse.json({
        project: {
          id: project.id,
          title: project.title,
          ai_generated_sow: project.ai_generated_sow,
          created_at: project.created_at,
          views: project.views,
          milestones: project.milestones.map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
            amount: milestone.amount,
            estimated_duration_days: milestone.estimated_duration_days,
          })),
        },
      });
    }

    const activeProjects = await prisma.project.findMany({
      where: { status: "OPEN_BIDDING" },
      orderBy: { created_at: "desc" },
      take: 10,
      include: { milestones: true },
    });

    const projects = activeProjects.map((project) => ({
      id: project.id,
      title: project.title,
      ai_generated_sow: project.ai_generated_sow,
      created_at: project.created_at,
      views: project.views,
      total_active_milestones: project.milestones.length,
      total_framework_value: project.milestones.reduce(
        (acc, milestone) => acc + Number(milestone.amount),
        0
      ),
      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        amount: milestone.amount,
        estimated_duration_days: milestone.estimated_duration_days,
      })),
    }));

    return NextResponse.json({
      success: true,
      metadata: {
        limit_applied: 10,
        total_extracted: projects.length,
        instruction: "Use a specific project ?id= parameter to retrieve one mapped project.",
      },
      projects,
    });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Automation projects endpoint failed:", error);
    return agentApiError({ error: "Unable to load automation project feed.", code: "AGENT_API_FAILED", status: 500 });
  }
}
