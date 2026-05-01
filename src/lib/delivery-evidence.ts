import { getMilestoneProofPlan, type MilestoneProofInput } from "./milestone-proof.ts";

export type EvidenceSourceTypeValue = "GITHUB" | "VERCEL" | "SUPABASE" | "DOMAIN" | "OTHER";
export type EvidenceSourceStatusValue = "CONNECTED" | "PENDING_VERIFICATION" | "NEEDS_ATTENTION";

export type ProjectEvidenceSourceInput = {
  type: EvidenceSourceTypeValue;
  status: EvidenceSourceStatusValue;
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
