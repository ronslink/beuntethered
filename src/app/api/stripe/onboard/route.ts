import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import { createStripeClient, getAppBaseUrl, isPaymentConfigurationError } from "@/lib/stripe";
import { syncStripeConnectVerification } from "@/lib/facilitator-verification";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") {
      return NextResponse.json({ error: "Only facilitator accounts can connect Stripe payouts.", code: "STRIPE_ONBOARD_UNAUTHORIZED" }, { status: 401 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("stripe.onboard", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    // 1. Verify Platform Connectivity Configuration
    const stripe = createStripeClient();
    let accountId = user.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email as string,
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripe_account_id: accountId }
      });
      await syncStripeConnectVerification(account);
    } else {
      const account = await stripe.accounts.retrieve(accountId);
      await syncStripeConnectVerification(account);
    }

    const origin = req.headers.get("origin") || getAppBaseUrl();
    const referer = req.headers.get("referer");
    const returnPath = (() => {
      try {
        const path = new URL(referer || origin).pathname;
        return ["/settings", "/wallet", "/onboarding"].includes(path) ? path : "/settings";
      } catch {
        return "/settings";
      }
    })();

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}${returnPath}?stripe_refresh=true`,
      return_url: `${origin}${returnPath}?stripe_success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
