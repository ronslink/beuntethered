import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    // 1. Bearer Token Extraction & Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token.startsWith("unth_")) {
       return NextResponse.json({ error: "Invalid API key structure." }, { status: 401 });
    }

    // 2. SHA-256 Decoupled Verification
    const hashedKey = crypto.createHash("sha256").update(token).digest("hex");
    const facilitator = await prisma.user.findUnique({
      where: { agent_key_hash: hashedKey }
    });

    if (!facilitator) {
      return NextResponse.json({ error: "Unauthorized. Key invalid or unbound." }, { status: 401 });
    }

    // 2.5 Security Hardening: Native API Extraction Rate Limiter

    // ── Auto-reset when lockout window has expired ─────────────────────────
    // Without this, a counter that reached 2 yesterday would still block on
    // the 3rd request today even though the 8-hour window has long passed.
    if (facilitator.locked_until && new Date() >= new Date(facilitator.locked_until)) {
      await prisma.user.update({
        where: { id: facilitator.id },
        data: { locked_until: null, api_daily_request_count: 0 },
      });
      // Re-fetch to get fresh counts for remaining guards
      Object.assign(facilitator, { locked_until: null, api_daily_request_count: 0 });
    }

    if (facilitator.locked_until && new Date() < new Date(facilitator.locked_until)) {
       return NextResponse.json({ 
          error: "API Exhaustion Protocol. Your extraction agent is currently in an active 8-hour blackout window.",
          locked_until: facilitator.locked_until 
       }, { status: 429 });
    }

    // Assess 3-query limit precisely
    if (facilitator.api_daily_request_count >= 3) {
       const blackoutTime = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 Hours out
       await prisma.user.update({
          where: { id: facilitator.id },
          data: { locked_until: blackoutTime, api_daily_request_count: 0 }
       });

       return NextResponse.json({ 
          error: "Strict API Limit Met. Maximum 3 extraction queries executed. Autonomous endpoint locked for 8 hours.",
          locked_until: blackoutTime
       }, { status: 429 });
    }

    // Execute daily increment safely before passing memory bounds
    await prisma.user.update({
       where: { id: facilitator.id },
       data: { api_daily_request_count: { increment: 1 } }
    });

    // 3. Extract Capped Search Parameters
    const url = new URL(req.url);
    const specificProjectId = url.searchParams.get("id");

    // If querying a specific project, ensure we return only that IF it is OPEN_BIDDING
    if (specificProjectId) {
       const project = await prisma.project.findUnique({
          where: { id: specificProjectId, status: "OPEN_BIDDING" },
          include: { milestones: true }
       });

       if (!project) return NextResponse.json({ error: "Project not found or securely sealed." }, { status: 404 });

       return NextResponse.json({
          project: {
             id: project.id,
             title: project.title,
             ai_generated_sow: project.ai_generated_sow,
             created_at: project.created_at,
             views: project.views,
             milestones: project.milestones.map(m => ({
                id: m.id,
                title: m.title,
                amount: m.amount,
                estimated_duration_days: m.estimated_duration_days
             }))
          }
       });
    }

    // 4. Rate-Capped Database Extraction (Max 10 per dump)
    const activeProjects = await prisma.project.findMany({
       where: {
          status: "OPEN_BIDDING"
       },
       orderBy: {
          created_at: 'desc'
       },
       take: 10,
       include: {
          milestones: true
       }
    });

    // 5. PII Masking and Data Shard Parsing
    const mappedProjects = activeProjects.map(project => ({
       id: project.id,
       title: project.title,
       ai_generated_sow: project.ai_generated_sow,
       created_at: project.created_at,
       views: project.views,
       total_active_milestones: project.milestones.length,
       total_framework_value: project.milestones.reduce((acc, m) => acc + Number(m.amount), 0),
       milestones: project.milestones.map(m => ({
          id: m.id,
          title: m.title,
          amount: m.amount,
          estimated_duration_days: m.estimated_duration_days
       }))
    }));

    return NextResponse.json({
       success: true,
       metadata: {
          limit_applied: 10,
          total_extracted: mappedProjects.length,
          instruction: "Use specific project ?id= parameter to bypass standard feed array if hunting a specific mapped target node."
       },
       projects: mappedProjects
    });

  } catch (error: any) {
    console.error("Agent Endpoint Fault:", error);
    return NextResponse.json({ error: "Internal Server Execution Fault natively." }, { status: 500 });
  }
}
