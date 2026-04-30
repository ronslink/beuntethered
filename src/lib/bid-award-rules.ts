export type FacilitatorAwardVerification = {
  stripe_account_id?: string | null;
  verifications?: { type: string; status: string }[];
};

export function getFacilitatorAwardReadiness(facilitator?: FacilitatorAwardVerification | null) {
  if (!facilitator?.stripe_account_id) {
    return {
      ok: false as const,
      code: "FACILITATOR_STRIPE_REQUIRED" as const,
      error: "The facilitator must connect Stripe Express before this proposal can be accepted.",
    };
  }

  const stripeVerified = facilitator.verifications?.some(
    (verification) => verification.type === "STRIPE" && verification.status === "VERIFIED"
  );
  const identityVerified = facilitator.verifications?.some(
    (verification) => verification.type === "IDENTITY" && verification.status === "VERIFIED"
  );

  if (!stripeVerified) {
    return {
      ok: false as const,
      code: "FACILITATOR_PAYOUT_VERIFICATION_REQUIRED" as const,
      error: "The facilitator must finish Stripe payout verification before this proposal can be accepted.",
    };
  }

  if (!identityVerified) {
    return {
      ok: false as const,
      code: "FACILITATOR_IDENTITY_VERIFICATION_REQUIRED" as const,
      error: "The facilitator must finish identity verification before this proposal can be accepted.",
    };
  }

  return { ok: true as const };
}
