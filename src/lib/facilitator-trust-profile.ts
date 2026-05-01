import { EVIDENCE_SOURCE_GUIDE, type EvidenceSourceTypeValue } from "./delivery-evidence.ts";

export type FacilitatorProofSignalStatus = "ready" | "pending" | "attention";

export type FacilitatorProofLevel = "emerging" | "verified" | "trusted" | "enterprise_ready";

export type FacilitatorProofSignal = {
  key: string;
  label: string;
  status: FacilitatorProofSignalStatus;
  detail: string;
};

export type FacilitatorTrustProfileInput = {
  stripeVerified: boolean;
  identityVerified: boolean;
  portfolioVerified?: boolean;
  profileComplete: boolean;
  completedMilestones: number;
  averageAuditScore: number;
  disputeCount: number;
  aiAgentStackCount: number;
  skillsCount: number;
  availability?: string | null;
  connectedEvidenceSourceCount?: number;
  evidenceProviderTypes?: EvidenceSourceTypeValue[];
  proofCapabilityTypes?: EvidenceSourceTypeValue[];
  profileViewCount?: number;
  bidCount?: number;
};

export type FacilitatorTrustProfile = {
  proofScore: number;
  proofLevel: FacilitatorProofLevel;
  proofLabel: string;
  buyerSignals: FacilitatorProofSignal[];
  highlights: string[];
  gaps: string[];
  evidenceProviderLabels: string[];
};

const EVIDENCE_LABELS = new Map(EVIDENCE_SOURCE_GUIDE.map((item) => [item.type, item.label]));

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function providerLabels(types: EvidenceSourceTypeValue[] = []) {
  return Array.from(new Set(types)).map((type) => EVIDENCE_LABELS.get(type) ?? type);
}

function auditScoreContribution(score: number) {
  if (score <= 0) return 0;
  return Math.min(15, (Math.min(100, score) / 100) * 15);
}

function milestoneContribution(count: number) {
  if (count >= 10) return 20;
  if (count >= 5) return 16;
  if (count >= 2) return 11;
  if (count >= 1) return 7;
  return 0;
}

function getProofLevel(score: number, input: FacilitatorTrustProfileInput): FacilitatorProofLevel {
  const hasCoreVerification = input.identityVerified && input.stripeVerified;
  const hasCleanDelivery = input.disputeCount === 0 && input.completedMilestones > 0;
  const hasEvidenceWorkflow = (input.connectedEvidenceSourceCount ?? 0) > 0;

  if (score >= 82 && hasCoreVerification && hasCleanDelivery && hasEvidenceWorkflow) return "enterprise_ready";
  if (score >= 68 && hasCoreVerification && hasCleanDelivery) return "trusted";
  if (score >= 45 && (input.identityVerified || input.stripeVerified || input.profileComplete)) return "verified";
  return "emerging";
}

function proofLabel(level: FacilitatorProofLevel) {
  if (level === "enterprise_ready") return "Enterprise ready";
  if (level === "trusted") return "Trusted delivery profile";
  if (level === "verified") return "Verified baseline";
  return "Emerging profile";
}

export function getFacilitatorTrustProfile(input: FacilitatorTrustProfileInput): FacilitatorTrustProfile {
  const connectedEvidenceSourceCount = input.connectedEvidenceSourceCount ?? 0;
  const proofCapabilityTypes = input.proofCapabilityTypes ?? [];
  const labels = providerLabels([...(input.evidenceProviderTypes ?? []), ...proofCapabilityTypes]);
  const declaredProofCapabilityCount = proofCapabilityTypes.length || labels.length;

  let score = 0;
  if (input.identityVerified) score += 15;
  if (input.stripeVerified) score += 15;
  if (input.profileComplete) score += 10;
  if (input.portfolioVerified) score += 8;
  score += milestoneContribution(input.completedMilestones);
  score += auditScoreContribution(input.averageAuditScore);
  if (input.disputeCount === 0) score += 10;
  if (input.aiAgentStackCount > 0 && input.skillsCount > 0) score += 5;
  if (connectedEvidenceSourceCount >= 3) score += 10;
  else if (connectedEvidenceSourceCount >= 1) score += 6;
  if (proofCapabilityTypes.length > 0) score += Math.min(4, proofCapabilityTypes.length);
  if (input.availability === "AVAILABLE" || input.availability === "READY_THIS_WEEK") score += 2;

  if (input.disputeCount > 0) score -= Math.min(12, input.disputeCount * 4);

  const proofScore = clampScore(score);
  const proofLevel = getProofLevel(proofScore, input);

  const buyerSignals: FacilitatorProofSignal[] = [
    {
      key: "identity",
      label: "Identity",
      status: input.identityVerified ? "ready" : "pending",
      detail: input.identityVerified
        ? "Identity verification is recorded."
        : "Identity verification should be completed before high-trust awards.",
    },
    {
      key: "payouts",
      label: "Stripe payouts",
      status: input.stripeVerified ? "ready" : "pending",
      detail: input.stripeVerified
        ? "Stripe payout readiness is verified."
        : "Payout verification is not complete yet.",
    },
    {
      key: "profile",
      label: "Profile evidence",
      status: input.profileComplete ? "ready" : "pending",
      detail: input.profileComplete
        ? input.portfolioVerified
          ? "Profile and portfolio evidence are verified."
          : "Bio, skills, AI workflow, and portfolio are ready for buyer review."
        : "Profile evidence should include bio, skills, AI workflow, and portfolio.",
    },
    {
      key: "delivery",
      label: "Delivery history",
      status: input.completedMilestones > 0 ? "ready" : "pending",
      detail:
        input.completedMilestones > 0
          ? `${input.completedMilestones} completed milestone${input.completedMilestones === 1 ? "" : "s"} recorded.`
          : "No completed marketplace milestones are recorded yet.",
    },
    {
      key: "audit",
      label: "Audit performance",
      status: input.averageAuditScore > 0 ? "ready" : "pending",
      detail:
        input.averageAuditScore > 0
          ? `${Math.round(input.averageAuditScore)}% average audit score.`
          : "No audit score history is available yet.",
    },
    {
      key: "evidence",
      label: "Evidence workflow",
      status: connectedEvidenceSourceCount > 0 ? "ready" : "pending",
      detail:
        connectedEvidenceSourceCount > 0
          ? `${connectedEvidenceSourceCount} connected source${connectedEvidenceSourceCount === 1 ? "" : "s"}${labels.length ? `: ${labels.slice(0, 3).join(", ")}` : ""}.`
          : "No connected evidence sources have been recorded yet.",
    },
    {
      key: "capabilities",
      label: "Proof capabilities",
      status: declaredProofCapabilityCount > 0 ? "ready" : "pending",
      detail:
        declaredProofCapabilityCount > 0
          ? `Active proof capabilities: ${labels.slice(0, 4).join(", ")}.`
          : "No active proof capabilities selected yet.",
    },
    {
      key: "disputes",
      label: "Dispute history",
      status: input.disputeCount === 0 ? "ready" : "attention",
      detail:
        input.disputeCount === 0
          ? "No disputes recorded."
          : `${input.disputeCount} dispute record${input.disputeCount === 1 ? "" : "s"} should be reviewed.`,
    },
  ];

  const highlights = buyerSignals
    .filter((signal) => signal.status === "ready")
    .slice(0, 4)
    .map((signal) => signal.detail);

  const gaps = buyerSignals
    .filter((signal) => signal.status !== "ready")
    .slice(0, 4)
    .map((signal) => signal.detail);

  return {
    proofScore,
    proofLevel,
    proofLabel: proofLabel(proofLevel),
    buyerSignals,
    highlights,
    gaps,
    evidenceProviderLabels: labels,
  };
}
