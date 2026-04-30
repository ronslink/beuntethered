import type { MilestoneStatus } from "@prisma/client";
import { canFundMilestone } from "./milestone-state.ts";

export function getPaymentRecordClientId({
  projectClientId,
  actorId,
}: {
  projectClientId?: string | null;
  actorId: string;
}) {
  return projectClientId || actorId;
}

export function validateMilestoneFundingReadiness(milestone: {
  status: MilestoneStatus;
  facilitator_id?: string | null;
}) {
  if (!canFundMilestone(milestone.status)) {
    return {
      ok: false as const,
      code: "MILESTONE_NOT_FUNDABLE" as const,
      status: 409,
      error: "This milestone is not ready for funding.",
    };
  }

  if (!milestone.facilitator_id) {
    return {
      ok: false as const,
      code: "MILESTONE_UNASSIGNED" as const,
      status: 409,
      error: "Assign a facilitator before funding this milestone.",
    };
  }

  return { ok: true as const };
}

export function validateFacilitatorPayoutReadiness(milestone: {
  facilitator?: {
    stripe_account_id?: string | null;
    verifications?: { type: string; status: string }[];
  } | null;
}) {
  const stripeAccountId = milestone.facilitator?.stripe_account_id;
  if (!stripeAccountId) {
    return {
      ok: false as const,
      code: "FACILITATOR_PAYOUT_NOT_READY" as const,
      status: 409,
      error: "Facilitator Stripe onboarding must be complete before escrow can be released.",
    };
  }

  const stripeVerified = milestone.facilitator?.verifications?.some(
    (verification) => verification.type === "STRIPE" && verification.status === "VERIFIED"
  );
  const identityVerified = milestone.facilitator?.verifications?.some(
    (verification) => verification.type === "IDENTITY" && verification.status === "VERIFIED"
  );

  if (!stripeVerified) {
    return {
      ok: false as const,
      code: "FACILITATOR_PAYOUT_NOT_VERIFIED" as const,
      status: 409,
      error: "Facilitator Stripe payout verification must be complete before escrow can be released.",
    };
  }

  if (!identityVerified) {
    return {
      ok: false as const,
      code: "FACILITATOR_IDENTITY_NOT_VERIFIED" as const,
      status: 409,
      error: "Facilitator identity verification must be complete before escrow can be released.",
    };
  }

  return { ok: true as const, stripeAccountId };
}

export function getPendingCheckoutBlock({
  pendingFundingRecord,
  now = new Date(),
  cooldownMs = 5 * 60 * 1000,
}: {
  pendingFundingRecord?: {
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
    stripe_checkout_session_id?: string | null;
    updated_at: Date;
  } | null;
  now?: Date;
  cooldownMs?: number;
}) {
  if (
    pendingFundingRecord?.status !== "PENDING" ||
    !pendingFundingRecord.stripe_checkout_session_id
  ) {
    return { blocked: false as const };
  }

  const ageMs = now.getTime() - pendingFundingRecord.updated_at.getTime();
  if (ageMs > cooldownMs) {
    return { blocked: false as const };
  }

  return {
    blocked: true as const,
    code: "CHECKOUT_ALREADY_STARTED" as const,
    status: 409,
    error: "Escrow checkout was already started. Complete the open Stripe checkout or try again in a few minutes.",
  };
}
