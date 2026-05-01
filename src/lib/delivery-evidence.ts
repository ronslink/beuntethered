import { getMilestoneProofPlan, type MilestoneProofInput } from "./milestone-proof.ts";

export type EvidenceSourceTypeValue = "GITHUB" | "VERCEL" | "RAILWAY" | "SUPABASE" | "DOMAIN" | "OTHER";
export type EvidenceSourceStatusValue = "CONNECTED" | "PENDING_VERIFICATION" | "NEEDS_ATTENTION";

export type ProjectEvidenceSourceInput = {
  type: EvidenceSourceTypeValue;
  status: EvidenceSourceStatusValue;
  label?: string | null;
};

export type EvidenceSourceGuideItem = {
  type: EvidenceSourceTypeValue;
  label: string;
  description: string;
  proofExamples: string[];
};

export type EvidenceSourceSummary = EvidenceSourceGuideItem & {
  count: number;
  connected: boolean;
  status: "connected" | "pending" | "missing" | "attention";
};

export const EVIDENCE_SOURCE_GUIDE: EvidenceSourceGuideItem[] = [
  {
    type: "GITHUB",
    label: "GitHub",
    description: "Repository, branch, commit, pull request, release tag, and automated check evidence.",
    proofExamples: ["repository URL", "commit SHA", "pull request", "CI check result"],
  },
  {
    type: "VERCEL",
    label: "Vercel",
    description: "Preview or production deployment evidence tied to the shipped commit.",
    proofExamples: ["deployment URL", "deployment ID", "build status", "commit mapping"],
  },
  {
    type: "RAILWAY",
    label: "Railway",
    description: "Backend service, worker, API, environment, database, and deployment evidence.",
    proofExamples: ["service URL", "deployment ID", "build log", "environment/service mapping"],
  },
  {
    type: "SUPABASE",
    label: "Supabase",
    description: "Database, migration, RLS, edge function, and storage evidence without exposing service-role secrets.",
    proofExamples: ["migration log", "schema snapshot", "RLS checklist", "test record export"],
  },
  {
    type: "DOMAIN",
    label: "Domain",
    description: "Domain control and launch-readiness evidence using DNS TXT or well-known file verification.",
    proofExamples: ["DNS TXT record", "well-known file", "production URL", "SSL status"],
  },
  {
    type: "OTHER",
    label: "Other evidence",
    description: "External systems, recordings, screenshots, files, reports, and handoff artifacts.",
    proofExamples: ["Loom walkthrough", "QA report", "integration log", "handoff document"],
  },
];

export function summarizeEvidenceSources(sources: ProjectEvidenceSourceInput[]): EvidenceSourceSummary[] {
  return EVIDENCE_SOURCE_GUIDE.map((guide) => {
    const matches = sources.filter((source) => source.type === guide.type);
    const hasAttention = matches.some((source) => source.status === "NEEDS_ATTENTION");
    const hasConnected = matches.some((source) => source.status === "CONNECTED");
    const hasPending = matches.some((source) => source.status === "PENDING_VERIFICATION");

    return {
      ...guide,
      count: matches.length,
      connected: hasConnected,
      status: hasAttention ? "attention" : hasConnected ? "connected" : hasPending ? "pending" : "missing",
    };
  });
}

export function getProjectEvidenceSourceCoverage(sources: ProjectEvidenceSourceInput[]) {
  const summary = summarizeEvidenceSources(sources);
  const connectedCount = summary.filter((item) => item.status === "connected").length;
  const pendingCount = summary.filter((item) => item.status === "pending").length;
  const attentionCount = summary.filter((item) => item.status === "attention").length;

  return {
    summary,
    connectedCount,
    pendingCount,
    attentionCount,
    totalSourceTypes: summary.length,
    readyForAudit: connectedCount > 0 && attentionCount === 0,
  };
}

const EVIDENCE_CONFIDENCE_WEIGHT: Record<EvidenceSourceTypeValue, number> = {
  VERCEL: 28,
  RAILWAY: 26,
  GITHUB: 24,
  SUPABASE: 22,
  DOMAIN: 16,
  OTHER: 8,
};

const EVIDENCE_CONFIDENCE_LABEL: Record<EvidenceSourceTypeValue, string> = {
  VERCEL: "live deployment evidence",
  RAILWAY: "backend service deployment evidence",
  GITHUB: "repository and code-change evidence",
  SUPABASE: "database and migration evidence",
  DOMAIN: "domain and launch-readiness evidence",
  OTHER: "supporting artifact evidence",
};

export function getEvidenceSourceBidConfidence(sources: ProjectEvidenceSourceInput[]) {
  const connectedSources = sources.filter((source) => source.status === "CONNECTED");
  const pendingSources = sources.filter((source) => source.status === "PENDING_VERIFICATION");
  const attentionSources = sources.filter((source) => source.status === "NEEDS_ATTENTION");
  const connectedTypes = new Set(connectedSources.map((source) => source.type));
  const pendingTypes = new Set(pendingSources.map((source) => source.type));
  const attentionTypes = new Set(attentionSources.map((source) => source.type));
  const hasSystemEvidence = ["VERCEL", "RAILWAY", "GITHUB", "SUPABASE", "DOMAIN"].some((type) =>
    connectedTypes.has(type as EvidenceSourceTypeValue),
  );
  const hasOnlySupportingEvidence = connectedTypes.size > 0 && !hasSystemEvidence;

  const score = Math.min(
    100,
    Math.round(
      Array.from(connectedTypes).reduce((total, type) => total + EVIDENCE_CONFIDENCE_WEIGHT[type], 15) +
        Array.from(pendingTypes).reduce((total, type) => total + Math.round(EVIDENCE_CONFIDENCE_WEIGHT[type] * 0.35), 0) -
        attentionTypes.size * 8,
    ),
  );

  const strengths =
    connectedTypes.size > 0
      ? Array.from(connectedTypes).map((type) => EVIDENCE_CONFIDENCE_LABEL[type])
      : ["no connected project evidence sources yet"];

  const gaps: string[] = [];
  if (!connectedTypes.has("VERCEL")) gaps.push("A connected Vercel deployment would make buyer review easier than screenshots alone.");
  if (!connectedTypes.has("RAILWAY")) gaps.push("A connected Railway service would strengthen backend, API, worker, or database delivery claims.");
  if (!connectedTypes.has("GITHUB")) gaps.push("A repository, commit, or PR link would raise delivery confidence.");
  if (hasOnlySupportingEvidence) gaps.push("Screenshots and files help, but they are weaker than live deployment or repository evidence.");
  if (attentionSources.length > 0) gaps.push("Some evidence sources need attention before they can raise proposal confidence.");

  return {
    score,
    level: score >= 65 ? "high" : score >= 45 ? "moderate" : "low",
    connectedCount: connectedSources.length,
    pendingCount: pendingSources.length,
    attentionCount: attentionSources.length,
    hasSystemEvidence,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
  };
}

export function buildMilestoneEvidencePacket(milestone: MilestoneProofInput & { id: string; status?: string }) {
  const proofPlan = getMilestoneProofPlan(milestone);
  const requiredArtifacts = proofPlan.requiredArtifacts;
  const availableArtifacts = requiredArtifacts.filter((artifact) => artifact.available);
  const missingArtifacts = requiredArtifacts.filter((artifact) => !artifact.available);

  return {
    id: milestone.id,
    title: typeof milestone.title === "string" ? milestone.title : "Milestone",
    status: typeof milestone.status === "string" ? milestone.status : "PENDING",
    requiredCount: requiredArtifacts.length,
    availableCount: availableArtifacts.length,
    missingCount: missingArtifacts.length,
    missingLabels: missingArtifacts.map((artifact) => artifact.label),
    ready: requiredArtifacts.length > 0 && missingArtifacts.length === 0,
    summary: proofPlan.summary,
  };
}
