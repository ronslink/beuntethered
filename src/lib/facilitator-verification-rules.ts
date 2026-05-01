import type { VerificationStatus } from "@prisma/client";

type StripeRequirementsLike = {
  currently_due?: string[] | null;
  past_due?: string[] | null;
  disabled_reason?: string | null;
};

export type StripeConnectAccountLike = {
  id: string;
  details_submitted?: boolean | null;
  payouts_enabled?: boolean | null;
  charges_enabled?: boolean | null;
  requirements?: StripeRequirementsLike | null;
  future_requirements?: StripeRequirementsLike | null;
};

export type StripeIdentitySessionLike = {
  id: string;
  status?: string | null;
  last_error?: { code?: string | null; reason?: string | null } | null;
};

export function resolveStripeConnectVerificationStatus(account: StripeConnectAccountLike): VerificationStatus {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;

  if (disabledReason && /rejected|fraud|listed|terms/i.test(disabledReason)) {
    return "REJECTED";
  }

  if (
    account.details_submitted &&
    account.payouts_enabled &&
    currentlyDue.length === 0 &&
    pastDue.length === 0 &&
    !disabledReason
  ) {
    return "VERIFIED";
  }

  return "PENDING";
}

export function buildStripeConnectEvidence(account: StripeConnectAccountLike) {
  return {
    provider_reference_id: account.id,
    details_submitted: Boolean(account.details_submitted),
    payouts_enabled: Boolean(account.payouts_enabled),
    charges_enabled: Boolean(account.charges_enabled),
    requirements: {
      currently_due: account.requirements?.currently_due ?? [],
      past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
    },
    future_requirements: {
      currently_due: account.future_requirements?.currently_due ?? [],
      past_due: account.future_requirements?.past_due ?? [],
      disabled_reason: account.future_requirements?.disabled_reason ?? null,
    },
  };
}

export function resolveStripeIdentityVerificationStatus(session: StripeIdentitySessionLike): VerificationStatus {
  if (session.status === "verified") return "VERIFIED";
  if (session.status === "requires_input" || session.status === "canceled") return "REJECTED";
  return "PENDING";
}

export function buildStripeIdentityEvidence(session: StripeIdentitySessionLike) {
  return {
    provider_reference_id: session.id,
    status: session.status ?? "unknown",
    last_error: session.last_error
      ? {
          code: session.last_error.code ?? null,
          reason: session.last_error.reason ?? null,
        }
      : null,
  };
}

export type PortfolioEvidenceLike = {
  portfolioUrl?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  aiToolStack?: string[] | null;
};

function isReviewableUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function resolvePortfolioVerificationStatus(profile: PortfolioEvidenceLike): VerificationStatus {
  if (!profile.portfolioUrl) return "PENDING";
  if (!isReviewableUrl(profile.portfolioUrl)) return "REJECTED";
  if (!profile.bio?.trim()) return "PENDING";
  if (!profile.skills || profile.skills.length === 0) return "PENDING";
  return "PENDING";
}

export function buildPortfolioEvidence(profile: PortfolioEvidenceLike) {
  return {
    portfolio_url: profile.portfolioUrl ?? null,
    has_bio: Boolean(profile.bio?.trim()),
    skills_count: profile.skills?.length ?? 0,
    ai_tool_count: profile.aiToolStack?.length ?? 0,
  };
}

export function buildVerificationNotificationCopy({
  type,
  status,
}: {
  type: "IDENTITY" | "STRIPE" | "PORTFOLIO" | "BUSINESS";
  status: VerificationStatus;
}) {
  const label =
    type === "STRIPE"
      ? "Stripe payout verification"
      : type === "IDENTITY"
        ? "Identity verification"
        : type === "PORTFOLIO"
          ? "Portfolio verification"
          : "Business verification";

  if (status === "VERIFIED") {
    return {
      type: "SUCCESS",
      message: `${label} is verified.`,
    };
  }

  if (status === "REJECTED") {
    return {
      type: "ERROR",
      message: `${label} needs attention before you can win or receive marketplace payouts.`,
    };
  }

  return {
    type: "WARNING",
    message: `${label} is pending review.`,
  };
}
