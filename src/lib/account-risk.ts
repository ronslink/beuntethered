import { createHmac } from "node:crypto";
import type { AccountRiskSeverity } from "@prisma/client";

type HeaderReader = {
  get(name: string): string | null;
};

export type RequestRiskFingerprint = {
  hashedIp: string | null;
  userAgentHash: string | null;
};

export type ProjectScopeRiskCandidate = {
  id: string;
  title: string;
  ai_generated_sow: string;
  creator_id: string;
  organization_id?: string | null;
  account_risk_signals?: { hashed_ip: string | null; user_agent_hash: string | null }[];
};

export type ProjectScopeRiskInput = {
  userId: string;
  organizationId?: string | null;
  title: string;
  aiGeneratedSow: string;
  fingerprint: RequestRiskFingerprint;
  candidates: ProjectScopeRiskCandidate[];
};

export type ScopeRiskAssessment = {
  severity: AccountRiskSeverity;
  reason: string;
  matchedProjectId: string | null;
  similarity: number;
  linkedSignals: string[];
};

export type BidSelfDealingRiskInput = {
  bidderId: string;
  projectCreatorId: string;
  projectClientId?: string | null;
  fingerprint: RequestRiskFingerprint;
  projectPostingSignals: { hashed_ip: string | null; user_agent_hash: string | null }[];
  isInvited?: boolean;
};

export function requestRiskFingerprintFromHeaders(headersList: HeaderReader): RequestRiskFingerprint {
  return {
    hashedIp: hashRiskValue(readForwardedIp(headersList)),
    userAgentHash: hashRiskValue(headersList.get("user-agent")),
  };
}

export function hashRiskValue(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return createHmac("sha256", riskHashSalt()).update(normalized).digest("hex");
}

export function readForwardedIp(headersList: HeaderReader) {
  const forwardedFor = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    headersList.get("true-client-ip") ||
    null
  );
}

export function assessProjectScopeRisk(input: ProjectScopeRiskInput): ScopeRiskAssessment {
  const currentScope = `${input.title} ${input.aiGeneratedSow}`;
  const ranked = input.candidates
    .map((candidate) => {
      const linkedSignals = linkedProjectSignals({
        candidate,
        userId: input.userId,
        organizationId: input.organizationId,
        fingerprint: input.fingerprint,
      });
      return {
        candidate,
        similarity: scopeSimilarity(currentScope, `${candidate.title} ${candidate.ai_generated_sow}`),
        linkedSignals,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  const best = ranked[0];
  if (!best || best.similarity < 0.82) {
    return {
      severity: "INFO",
      reason: "Project posted with no high-similarity open scope match.",
      matchedProjectId: null,
      similarity: best?.similarity ?? 0,
      linkedSignals: [],
    };
  }

  if (best.similarity >= 0.86 && best.linkedSignals.length > 0) {
    return {
      severity: "REVIEW",
      reason: "Similar scope plus linked account signals. Keep posting allowed, but review before award.",
      matchedProjectId: best.candidate.id,
      similarity: best.similarity,
      linkedSignals: best.linkedSignals,
    };
  }

  return {
    severity: "INFO",
    reason: "Similar scope detected without linked identity signals. Treat as normal marketplace overlap.",
    matchedProjectId: best.candidate.id,
    similarity: best.similarity,
    linkedSignals: [],
  };
}

export function assessBidSelfDealingRisk(input: BidSelfDealingRiskInput): {
  severity: AccountRiskSeverity;
  reason: string;
  linkedSignals: string[];
} {
  const linkedSignals: string[] = [];
  if (input.bidderId === input.projectCreatorId || input.bidderId === input.projectClientId) {
    linkedSignals.push("same_user");
  }

  const sameIp = input.fingerprint.hashedIp
    ? input.projectPostingSignals.some((signal) => signal.hashed_ip === input.fingerprint.hashedIp)
    : false;
  const sameUserAgent = input.fingerprint.userAgentHash
    ? input.projectPostingSignals.some((signal) => signal.user_agent_hash === input.fingerprint.userAgentHash)
    : false;

  if (sameIp) linkedSignals.push("same_hashed_ip");
  if (sameUserAgent) linkedSignals.push("same_user_agent_hash");
  if (input.isInvited) linkedSignals.push("client_invited");

  if (linkedSignals.includes("same_user")) {
    return {
      severity: "BLOCK",
      reason: "Buyer and facilitator resolve to the same user account.",
      linkedSignals,
    };
  }

  if (sameIp && sameUserAgent && !input.isInvited) {
    return {
      severity: "REVIEW",
      reason: "Bid submitted from the same hashed IP and browser family as the project posting.",
      linkedSignals,
    };
  }

  if (sameIp) {
    return {
      severity: "INFO",
      reason: "Bid shares hashed IP with the project posting. This is logged as a weak signal only.",
      linkedSignals,
    };
  }

  return {
    severity: "INFO",
    reason: "Bid submitted without linked request signals.",
    linkedSignals,
  };
}

function linkedProjectSignals({
  candidate,
  userId,
  organizationId,
  fingerprint,
}: {
  candidate: ProjectScopeRiskCandidate;
  userId: string;
  organizationId?: string | null;
  fingerprint: RequestRiskFingerprint;
}) {
  const linkedSignals: string[] = [];
  if (candidate.creator_id === userId) linkedSignals.push("same_creator");
  if (organizationId && candidate.organization_id === organizationId) linkedSignals.push("same_organization");
  const sameIp = fingerprint.hashedIp
    ? candidate.account_risk_signals?.some((signal) => signal.hashed_ip === fingerprint.hashedIp)
    : false;
  const sameUserAgent = fingerprint.userAgentHash
    ? candidate.account_risk_signals?.some((signal) => signal.user_agent_hash === fingerprint.userAgentHash)
    : false;
  if (sameIp) linkedSignals.push("same_hashed_ip");
  if (sameUserAgent) linkedSignals.push("same_user_agent_hash");
  return linkedSignals;
}

export function scopeSimilarity(left: string, right: string) {
  const leftTerms = tokenizeScope(left);
  const rightTerms = tokenizeScope(right);
  if (leftTerms.size === 0 || rightTerms.size === 0) return 0;
  const intersection = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return intersection / union;
}

function tokenizeScope(value: string) {
  const stop = new Set([
    "the",
    "and",
    "with",
    "for",
    "from",
    "that",
    "this",
    "into",
    "your",
    "will",
    "build",
    "create",
    "deliver",
    "project",
    "software",
  ]);
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !stop.has(term))
  );
}

function riskHashSalt() {
  return process.env.ACCOUNT_RISK_HASH_SALT || process.env.NEXTAUTH_SECRET || "development-account-risk-salt";
}
