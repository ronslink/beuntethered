import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "./auth";
import { createSystemNotification } from "./notifications";
import {
  buildPortfolioEvidence,
  buildStripeConnectEvidence,
  buildStripeIdentityEvidence,
  buildVerificationNotificationCopy,
  resolvePortfolioVerificationStatus,
  resolveStripeConnectVerificationStatus,
  resolveStripeIdentityVerificationStatus,
} from "./facilitator-verification-rules.ts";

export async function upsertUserVerification({
  userId,
  type,
  status,
  provider,
  evidence,
}: {
  userId: string;
  type: "IDENTITY" | "STRIPE" | "PORTFOLIO" | "BUSINESS";
  status: "PENDING" | "VERIFIED" | "REJECTED";
  provider: string;
  evidence?: Prisma.InputJsonValue;
}) {
  const previous = await prisma.verification.findUnique({
    where: { user_id_type: { user_id: userId, type } },
    select: { id: true, status: true },
  });

  const verification = await prisma.verification.upsert({
    where: { user_id_type: { user_id: userId, type } },
    update: {
      status,
      provider,
      evidence,
      reviewed_at: status === "VERIFIED" ? new Date() : null,
    },
    create: {
      user_id: userId,
      type,
      status,
      provider,
      evidence,
      reviewed_at: status === "VERIFIED" ? new Date() : null,
    },
  });

  if (!previous || previous.status !== status) {
    const notification = buildVerificationNotificationCopy({ type, status });
    await createSystemNotification({
      userId,
      message: notification.message,
      type: notification.type,
      href: "/settings",
      sourceKey: `verification:${verification.id}:${status}`,
      metadata: {
        verification_id: verification.id,
        verification_type: type,
        verification_status: status,
        previous_status: previous?.status ?? null,
        provider,
      },
    });
  }

  return verification;
}

export async function syncStripeConnectVerification(account: Stripe.Account) {
  const user = await prisma.user.findFirst({
    where: { stripe_account_id: account.id },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "FACILITATOR") return null;

  return upsertUserVerification({
    userId: user.id,
    type: "STRIPE",
    status: resolveStripeConnectVerificationStatus(account),
    provider: "stripe_connect",
    evidence: buildStripeConnectEvidence(account),
  });
}

export async function syncStripeIdentityVerificationSession(session: Stripe.Identity.VerificationSession) {
  const userId = session.metadata?.user_id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "FACILITATOR") return null;

  return upsertUserVerification({
    userId: user.id,
    type: "IDENTITY",
    status: resolveStripeIdentityVerificationStatus(session),
    provider: "stripe_identity",
    evidence: buildStripeIdentityEvidence(session),
  });
}

export async function syncPortfolioVerification({
  userId,
  portfolioUrl,
  bio,
  skills,
  aiToolStack,
}: {
  userId: string;
  portfolioUrl?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  aiToolStack?: string[] | null;
}) {
  return upsertUserVerification({
    userId,
    type: "PORTFOLIO",
    status: resolvePortfolioVerificationStatus({ portfolioUrl, bio, skills, aiToolStack }),
    provider: "profile_evidence",
    evidence: buildPortfolioEvidence({ portfolioUrl, bio, skills, aiToolStack }),
  });
}
