import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: Request) {
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

    // 3. Payload Integrity
    const body = await req.json();
    const { milestone_id, payload_storage_path } = body;

    if (!milestone_id) {
       return NextResponse.json({ error: "milestone_id is required natively." }, { status: 400 });
    }

    // 4. Milestone Assignment Integrity Check
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestone_id },
      include: { project: true }
    });

    if (!milestone) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

    if (milestone.facilitator_id !== facilitator.id) {
       return NextResponse.json({ error: "Forbidden. Agent token does not own this milestone." }, { status: 403 });
    }

    if (milestone.status !== "FUNDED_IN_ESCROW") {
       return NextResponse.json({ error: "Milestone is currently not eligible for Review submission." }, { status: 400 });
    }

    // 5. Atomic Native Execution
    await prisma.$transaction([
      prisma.milestone.update({
        where: { id: milestone.id },
        data: { 
          status: "SUBMITTED_FOR_REVIEW",
          payload_storage_path: payload_storage_path || milestone.payload_storage_path
        }
      }),
      prisma.timelineEvent.create({
         data: {
            project_id: milestone.project_id,
            milestone_id: milestone.id,
            type: "SYSTEM",
            description: `Agent submitted milestone proof on behalf of ${facilitator.name || "Facilitator"}`,
            status: "SUCCESS",
            author: "Automated Agent",
         }
      })
    ]);

    return NextResponse.json({ success: true, message: "Milestone securely committed to review." });
  } catch (error: any) {
    console.error("Headless Bot API Error:", error);
    return NextResponse.json({ error: "Internal Server Bounds Error" }, { status: 500 });
  }
}
