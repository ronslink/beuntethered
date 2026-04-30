import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { verifyGitHubWebhookSignature } from "@/lib/github";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const verification = verifyGitHubWebhookSignature({
      payload,
      signatureHeader: req.headers.get("x-hub-signature-256"),
    });

    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.message, code: verification.code },
        { status: verification.status }
      );
    }

    const body = JSON.parse(payload);

    // Ensure it's a valid GitHub repo payload
    if (!body || !body.repository || !body.repository.html_url) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const repoUrl = body.repository.html_url;
    await assertDurableRateLimit({
      key: rateLimitKey("webhook.github", repoUrl),
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });

    // 1. Locate the project connected to this repository.
    const project = await prisma.project.findFirst({
      where: { 
        github_repo_url: {
            contains: repoUrl,
            mode: "insensitive"
        }
      }
    });

    if (!project) {
        // Safe to ignore; the platform is not tracking this URL.
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

    // 3. Batch commit proof-of-work events directly to the project timeline.
    if (timelineEventsData.length > 0) {
      await prisma.timelineEvent.createMany({
        data: timelineEventsData
      });
      console.log(`[Webhook: GitHub] Captured ${timelineEventsData.length} proof-of-work events for Project: ${project.id}`);
    } else {
        console.log("[Webhook: GitHub] Event ignored because no milestone markers were present.");
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("GitHub webhook processing failed:", error);
    return new NextResponse(`Server Error: ${error.message}`, { status: 500 });
  }
}
