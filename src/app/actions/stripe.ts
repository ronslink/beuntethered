"use server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
  apiVersion: "2023-10-16" as any
});

export async function createStripeLoginLink() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") {
      return { success: false, error: "Unauthorized. Access restricted." };
    }

    const accountId = user.stripe_account_id;
    if (!accountId) {
       return { success: false, error: "No connected Stripe account found." };
    }

    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return { success: true, url: loginLink.url };
  } catch (error: any) {
    console.error("Stripe Dashboard Link Failed:", error.message);
    return { success: false, error: "Internal server error connecting to Payment gateway." };
  }
}
