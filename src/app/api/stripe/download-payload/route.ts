import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { generateSignedDownloadUrl } from "@/lib/storage";
import { canAccessEscrowPayload, isEscrowPayloadLockedForUser } from "@/lib/attachment-access";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.download-payload", user.id),
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });

    const url = new URL(req.url);
    const milestoneId = url.searchParams.get("id");
    if (!milestoneId) {
      return NextResponse.json({ error: "Milestone ID required" }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: {
            organization: {
              select: {
                members: {
                  where: { user_id: user.id },
                  select: { user_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!milestone || !milestone.payload_storage_path) {
      return NextResponse.json({ error: "Payload not found" }, { status: 404 });
    }

    if (!canAccessEscrowPayload(user, milestone)) {
      const isLocked = isEscrowPayloadLockedForUser(user, milestone);
      return NextResponse.json(
        {
          error: isLocked
            ? "Source payload unlocks after milestone approval."
            : "Payload access denied",
          code: isLocked ? "PAYLOAD_LOCKED" : "PAYLOAD_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    const downloadUrl = await generateSignedDownloadUrl(milestone.payload_storage_path);
    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    throw error;
  }
}
