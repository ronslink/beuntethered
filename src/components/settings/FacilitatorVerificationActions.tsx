"use client";

import { useState } from "react";

export default function FacilitatorVerificationActions({
  hasStripeAccount,
  stripeStatus,
  identityStatus,
}: {
  hasStripeAccount: boolean;
  stripeStatus: string;
  identityStatus: string;
}) {
  const [loading, setLoading] = useState<"stripe" | "identity" | null>(null);
  const stripeVerified = stripeStatus === "VERIFIED";
  const identityVerified = identityStatus === "VERIFIED";
  const stripeRejected = stripeStatus === "REJECTED";
  const identityRejected = identityStatus === "REJECTED";
  const awardReady = stripeVerified && identityVerified;
  const needsAttention = stripeRejected || identityRejected;

  const redirectFromResponse = async (response: Response) => {
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.url) {
      throw new Error(data?.error || "Verification could not be started.");
    }
    window.location.href = data.url;
  };

  const startStripeOnboarding = async () => {
    setLoading("stripe");
    try {
      const response = await fetch("/api/stripe/onboard", { method: "POST" });
      await redirectFromResponse(response);
    } catch (error: any) {
      alert(error.message || "Stripe onboarding could not be started.");
      setLoading(null);
    }
  };

  const startIdentityVerification = async () => {
    setLoading("identity");
    try {
      const response = await fetch("/api/stripe/identity-session", { method: "POST" });
      await redirectFromResponse(response);
    } catch (error: any) {
      alert(error.message || "Identity verification could not be started.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border px-4 py-3 ${
        awardReady
          ? "border-[#059669]/30 bg-[#059669]/10"
          : needsAttention
            ? "border-error/30 bg-error/10"
            : "border-secondary/20 bg-secondary/5"
      }`}>
        <p className={`text-[10px] font-black uppercase tracking-widest ${awardReady ? "text-[#059669]" : needsAttention ? "text-error" : "text-secondary"}`}>
          {awardReady ? "Award eligible" : needsAttention ? "Verification needs attention" : "Award verification needed"}
        </p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-on-surface-variant">
          {awardReady
            ? "You can win bids and receive approved marketplace payouts."
            : needsAttention
              ? "Update the flagged verification step, then wait for the provider webhook to refresh this status."
              : "You can submit proposals while verification is pending, but winning a bid requires verified identity and Stripe payout readiness."}
        </p>
      </div>

      <button
        type="button"
        onClick={startStripeOnboarding}
        disabled={loading !== null}
        className="w-full rounded-lg bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading === "stripe"
          ? "Opening Stripe..."
          : hasStripeAccount
            ? stripeVerified ? "Refresh Stripe Verification" : "Continue Stripe Verification"
            : "Connect Stripe Express"}
      </button>

      <button
        type="button"
        onClick={startIdentityVerification}
        disabled={loading !== null || identityVerified}
        className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        {loading === "identity"
          ? "Opening Identity..."
          : identityVerified ? "Identity Verified" : identityRejected ? "Retry Identity Verification" : "Start Identity Verification"}
      </button>

      <p className="text-[11px] font-medium leading-relaxed text-on-surface-variant">
        Stripe verifies payout readiness separately from document identity. Untether stores status, safe provider references, and lifecycle metadata, not ID images.
      </p>
    </div>
  );
}
