import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { canAccessAttachment, isEscrowPayloadAttachment } from "@/lib/attachment-access";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("attachment.download", user.id),
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });

    const { id } = await context.params;
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        milestone: {
          select: {
            id: true,
            status: true,
            payload_storage_path: true,
            facilitator_id: true,
          },
        },
        dispute: {
          select: {
            client_id: true,
            facilitator_id: true,
          },
        },
        project: {
          select: {
            id: true,
            client_id: true,
            creator_id: true,
            organization: {
              select: {
                members: {
                  where: { user_id: user.id },
                  select: { user_id: true },
                },
              },
            },
            milestones: {
              where: { facilitator_id: user.id },
              select: { facilitator_id: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    if (!canAccessAttachment(user, attachment)) {
      const isLockedPayload = isEscrowPayloadAttachment(attachment);
      return NextResponse.json(
        {
          error: isLockedPayload
            ? "Source payload unlocks after milestone approval."
            : "Attachment access denied",
          code: isLockedPayload ? "PAYLOAD_LOCKED" : "ATTACHMENT_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    return NextResponse.redirect(attachment.url, 302);
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
