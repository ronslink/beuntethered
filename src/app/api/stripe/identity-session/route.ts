import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createStripeClient, getAppBaseUrl, isPaymentConfigurationError } from "@/lib/stripe";
import { upsertUserVerification } from "@/lib/facilitator-verification";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") {
      return NextResponse.json(
        { error: "Only facilitator accounts can start identity verification.", code: "IDENTITY_UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.identity-session", user.id),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    const stripe = createStripeClient();
    const origin = req.headers.get("origin") || getAppBaseUrl();
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
        verification_type: "IDENTITY",
      },
      return_url: `${origin}/settings?identity_verification=returned`,
    });

    await upsertUserVerification({
      userId: user.id,
      type: "IDENTITY",
      status: "PENDING",
      provider: "stripe_identity",
      evidence: {
        provider_reference_id: session.id,
        status: session.status,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    if (isPaymentConfigurationError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    }
    console.error("[Stripe Identity] Session creation failed:", error);
    return NextResponse.json(
      { error: "Unable to start identity verification.", code: "IDENTITY_SESSION_FAILED" },
      { status: 500 }
    );
  }
}
