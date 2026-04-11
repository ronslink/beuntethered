import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10" // Using a secure stable API hook point
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Unauthorized. Must be an expert to onboard." }, { status: 401 });
    }

    // 1. Verify Platform Connectivity Configuration
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
    }

    // 2. Generate securely constrained onboarding link mapping back to Wallet
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/wallet?refresh=true`,
      return_url: `${origin}/wallet?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
