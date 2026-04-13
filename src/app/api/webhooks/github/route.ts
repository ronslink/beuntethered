import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ensure it's a valid GitHub repo payload
    if (!body || !body.repository || !body.repository.html_url) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const repoUrl = body.repository.html_url;

    // 1. Locate the physical project native bound to this repository
    const project = await prisma.project.findFirst({
      where: { 
        github_repo_url: {
            contains: repoUrl,
            mode: "insensitive"
        }
      }
    });

    if (!project) {
        // Safe to ignore, platform simply isn't tracking this URL natively
        return new NextResponse("Repository unbound", { status: 200 });
    }

    const timelineEventsData: any[] = [];

    // 2. Parse payload types (Push commits or PRs)
    
    // A: Handle 'push' events
    if (body.commits && Array.isArray(body.commits)) {
      body.commits.forEach((commit: any) => {
        // STRICT FILTER: Only log explicit Milestone tags or explicit Review flags
        const msg = commit.message || "";
        const isMilestone = msg.toLowerCase().includes("[milestone");
        const isSubmit = msg.toLowerCase().includes("[submit]");
        const isCore = msg.toLowerCase().includes("feat(core)");

        if (isMilestone || isSubmit || isCore) {
           timelineEventsData.push({
              project_id: project.id,
              type: isMilestone ? "MILESTONE" : "COMMIT",
              description: msg.length > 100 ? msg.substring(0, 100) + "..." : msg,
              status: "SUCCESS",
              author: commit.author?.name || "Facilitator",
              commitHash: commit.id ? commit.id.substring(0, 7) : undefined,
              timestamp: new Date()
           });
        }
      });
    }

    // B: Handle 'pull_request' events (when merged into main/master)
    if (body.action === "closed" && body.pull_request && body.pull_request.merged) {
       timelineEventsData.push({
          project_id: project.id,
          type: "REVIEW",
          description: `PR #${body.pull_request.number} Merged: ${body.pull_request.title}`,
          status: "SUCCESS",
          author: body.pull_request.user?.login || "Facilitator",
          commitHash: body.pull_request.merge_commit_sha ? body.pull_request.merge_commit_sha.substring(0, 7) : undefined,
          timestamp: new Date()
       });
    }

    // 3. Batch commit native interactions directly to DB bypassing async races
    if (timelineEventsData.length > 0) {
      await prisma.timelineEvent.createMany({
        data: timelineEventsData
      });
      console.log(`[Webhook: GitHub] Captured ${timelineEventsData.length} proof-of-work events natively for Project: ${project.id}`);
    } else {
        console.log(`[Webhook: GitHub] Event ignored (no explicit milestone verifications bounds hit)`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("Critical GitHub Webhook Pipeline Fault:", error);
    return new NextResponse(`Server Error: ${error.message}`, { status: 500 });
  }
}
