"use server";

import { getCurrentUser } from "@/lib/session";
import { createStripeClient, isPaymentConfigurationError } from "@/lib/stripe";

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

    const stripe = createStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return { success: true, url: loginLink.url };
  } catch (error: any) {
    if (isPaymentConfigurationError(error)) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Stripe Dashboard Link Failed:", error.message);
    return { success: false, error: "Internal server error connecting to Payment gateway." };
  }
}
